import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import type { Pinia } from 'pinia';
import AddonForm from '../../src/views/AddonForm.vue';
import { useAddonStore } from '../../src/stores/addons';
import { usePlanAdminStore } from '../../src/stores/planAdmin';
import { configureAuthStore, useAuthStore } from '@/stores/auth';

vi.mock('@/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn().mockResolvedValue({ addon: {} }),
    put: vi.fn(),
    delete: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn()
  },
  initializeApi: vi.fn(),
  clearApiAuth: vi.fn()
}));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}));

const mockPush = vi.fn();
const mockRouteParams: Record<string, string | undefined> = {};

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush
  }),
  useRoute: () => ({
    params: mockRouteParams
  })
}));

const mockAddon = {
  id: 'abc-123',
  name: 'Priority Support',
  slug: 'priority-support',
  description: 'Priority support add-on',
  price: '9.99',
  currency: 'EUR',
  billing_period: 'monthly',
  config: { max_tickets: 10 },
  is_active: true,
  sort_order: 1,
  tarif_plan_ids: [],
  tarif_plans: [],
  created_at: '2026-01-01',
  updated_at: '2026-01-01'
};

const mockPlans = [
  { id: 'plan-1', name: 'Basic', billing_period: 'monthly', is_active: true },
  { id: 'plan-2', name: 'Pro', billing_period: 'monthly', is_active: true },
  { id: 'plan-3', name: 'Archived', billing_period: 'monthly', is_active: false }
];

let pinia: Pinia;

function mountForm(editMode = false) {
  if (editMode) {
    mockRouteParams.id = 'abc-123';
  } else {
    mockRouteParams.id = undefined;
  }

  return mount(AddonForm, {
    global: {
      plugins: [pinia],
      mocks: {
        $t: (key: string) => key
      }
    }
  });
}

describe('AddonForm View', () => {
  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    configureAuthStore({
      storageKey: 'test_token',
      apiClient: { post: async () => ({}), get: async () => ({}), setToken: () => {} } as any,
    });
    const authStore = useAuthStore();
    authStore.$patch({
      user: { id: '1', email: 'admin@test.com', role: 'SUPER_ADMIN', permissions: ['*'] },
      token: 'test-token',
    });
    vi.clearAllMocks();
    mockRouteParams.id = undefined;

    // Mock plan store to return plans by default
    const planStore = usePlanAdminStore();
    planStore.fetchPlans = vi.fn().mockResolvedValue(mockPlans);
  });

  it('renders create form title', async () => {
    const wrapper = mountForm(false);
    await flushPromises();

    expect(wrapper.find('[data-testid="form-title"]').text()).toBe('addOns.createAddon');
  });

  it('renders edit form title', async () => {
    const store = useAddonStore();
    store.fetchAddon = vi.fn().mockResolvedValue(mockAddon);

    const wrapper = mountForm(true);
    await flushPromises();

    expect(wrapper.find('[data-testid="form-title"]').text()).toBe('addOns.editAddon');
  });

  it('populates form in edit mode', async () => {
    const store = useAddonStore();
    store.fetchAddon = vi.fn().mockResolvedValue(mockAddon);

    const wrapper = mountForm(true);
    await flushPromises();

    const nameInput = wrapper.find('[data-testid="addon-name"]').element as HTMLInputElement;
    expect(nameInput.value).toBe('Priority Support');

    const slugInput = wrapper.find('[data-testid="addon-slug"]').element as HTMLInputElement;
    expect(slugInput.value).toBe('priority-support');
  });

  it('validates required name', async () => {
    const wrapper = mountForm(false);
    await flushPromises();

    await wrapper.find('[data-testid="addon-billing"]').setValue('monthly');
    await wrapper.find('[data-testid="submit-button"]').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-testid="validation-error"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="validation-error"]').text()).toBe('addOns.nameRequired');
  });

  it('validates required billing period', async () => {
    const wrapper = mountForm(false);
    await flushPromises();

    await wrapper.find('[data-testid="addon-name"]').setValue('Test Addon');
    await wrapper.find('[data-testid="submit-button"]').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-testid="validation-error"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="validation-error"]').text()).toBe('addOns.billingPeriodRequired');
  });

  it('submit create calls store', async () => {
    const store = useAddonStore();
    store.createAddon = vi.fn().mockResolvedValue({ addon: { id: 'new-1' } });

    const wrapper = mountForm(false);
    await flushPromises();

    await wrapper.find('[data-testid="addon-name"]').setValue('Test Addon');
    await wrapper.find('[data-testid="addon-price"]').setValue(9.99);
    await wrapper.find('[data-testid="addon-billing"]').setValue('MONTHLY');
    await wrapper.find('[data-testid="submit-button"]').trigger('click');
    await flushPromises();

    expect(store.createAddon).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/admin/add-ons');
  });

  it('submit edit calls store updateAddon', async () => {
    const store = useAddonStore();
    store.fetchAddon = vi.fn().mockResolvedValue(mockAddon);
    store.updateAddon = vi.fn().mockResolvedValue({ addon: mockAddon });

    const wrapper = mountForm(true);
    await flushPromises();

    await wrapper.find('[data-testid="addon-name"]').setValue('Updated Name');
    await wrapper.find('[data-testid="submit-button"]').trigger('click');
    await flushPromises();

    expect(store.updateAddon).toHaveBeenCalledWith('abc-123', expect.objectContaining({ name: 'Updated Name' }));
    expect(mockPush).toHaveBeenCalledWith('/admin/add-ons');
  });

  it('cancel navigates back', async () => {
    const wrapper = mountForm(false);
    await flushPromises();

    await wrapper.find('[data-testid="cancel-button"]').trigger('click');
    expect(mockPush).toHaveBeenCalledWith('/admin/add-ons');
  });

  it('back button navigates', async () => {
    const wrapper = mountForm(false);
    await flushPromises();

    await wrapper.find('[data-testid="back-button"]').trigger('click');
    expect(mockPush).toHaveBeenCalledWith('/admin/add-ons');
  });

  it('shows activate button for inactive addon in edit mode', async () => {
    const inactiveAddon = { ...mockAddon, is_active: false };
    const store = useAddonStore();
    store.fetchAddon = vi.fn().mockResolvedValue(inactiveAddon);

    const wrapper = mountForm(true);
    await flushPromises();

    expect(wrapper.find('[data-testid="activate-button"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="deactivate-button"]').exists()).toBe(false);
  });

  it('shows deactivate button for active addon in edit mode', async () => {
    const store = useAddonStore();
    store.fetchAddon = vi.fn().mockResolvedValue(mockAddon);

    const wrapper = mountForm(true);
    await flushPromises();

    expect(wrapper.find('[data-testid="deactivate-button"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="activate-button"]').exists()).toBe(false);
  });

  it('shows delete button in edit mode', async () => {
    const store = useAddonStore();
    store.fetchAddon = vi.fn().mockResolvedValue(mockAddon);

    const wrapper = mountForm(true);
    await flushPromises();

    expect(wrapper.find('[data-testid="delete-button"]').exists()).toBe(true);
  });

  it('does not show action buttons in create mode', async () => {
    const wrapper = mountForm(false);
    await flushPromises();

    expect(wrapper.find('[data-testid="activate-button"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="deactivate-button"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="delete-button"]').exists()).toBe(false);
  });

  it('shows loading in edit mode', () => {
    const store = useAddonStore();
    store.loading = true;
    store.fetchAddon = vi.fn().mockReturnValue(new Promise(() => {}));

    const wrapper = mountForm(true);

    expect(wrapper.find('[data-testid="loading-spinner"]').exists()).toBe(true);
  });

  it('shows fetch error', async () => {
    const store = useAddonStore();
    store.fetchAddon = vi.fn().mockRejectedValue(new Error('Not found'));

    const wrapper = mountForm(true);
    await flushPromises();

    expect(wrapper.find('[data-testid="error-message"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="error-message"]').text()).toContain('Not found');
  });

  it('description textarea updates', async () => {
    const wrapper = mountForm(false);
    await flushPromises();

    const textarea = wrapper.find('[data-testid="addon-description"]');
    await textarea.setValue('Test description');

    expect((textarea.element as HTMLTextAreaElement).value).toBe('Test description');
  });

  it('sort order input updates', async () => {
    const wrapper = mountForm(false);
    await flushPromises();

    const input = wrapper.find('[data-testid="addon-sort-order"]');
    await input.setValue(5);

    expect((input.element as HTMLInputElement).value).toBe('5');
  });

  // Sprint 13: Plan selector tests
  it('renders plan checkboxes from plan store', async () => {
    const wrapper = mountForm(false);
    await flushPromises();

    const checkboxes = wrapper.find('[data-testid="plan-checkboxes"]');
    expect(checkboxes.exists()).toBe(true);

    // Only active plans should appear (Basic, Pro — not Archived)
    expect(wrapper.find('[data-testid="plan-checkbox-plan-1"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="plan-checkbox-plan-2"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="plan-checkbox-plan-3"]').exists()).toBe(false);
  });

  it('plan checkboxes are unchecked by default in create mode', async () => {
    const wrapper = mountForm(false);
    await flushPromises();

    const cb1 = wrapper.find('[data-testid="plan-checkbox-plan-1"]').element as HTMLInputElement;
    const cb2 = wrapper.find('[data-testid="plan-checkbox-plan-2"]').element as HTMLInputElement;
    expect(cb1.checked).toBe(false);
    expect(cb2.checked).toBe(false);
  });

  it('plan checkboxes reflect saved values in edit mode', async () => {
    const addonWithPlans = { ...mockAddon, tarif_plan_ids: ['plan-1'] };
    const store = useAddonStore();
    store.fetchAddon = vi.fn().mockResolvedValue(addonWithPlans);

    const wrapper = mountForm(true);
    await flushPromises();

    const cb1 = wrapper.find('[data-testid="plan-checkbox-plan-1"]').element as HTMLInputElement;
    const cb2 = wrapper.find('[data-testid="plan-checkbox-plan-2"]').element as HTMLInputElement;
    expect(cb1.checked).toBe(true);
    expect(cb2.checked).toBe(false);
  });

  it('toggling plan checkbox updates form data', async () => {
    const wrapper = mountForm(false);
    await flushPromises();

    const cb1 = wrapper.find('[data-testid="plan-checkbox-plan-1"]');
    await cb1.setValue(true);
    await flushPromises();

    // Verify the checkbox is checked
    expect((cb1.element as HTMLInputElement).checked).toBe(true);
  });

  it('submit includes tarif_plan_ids', async () => {
    const store = useAddonStore();
    store.createAddon = vi.fn().mockResolvedValue({ addon: { id: 'new-1' } });

    const wrapper = mountForm(false);
    await flushPromises();

    await wrapper.find('[data-testid="addon-name"]').setValue('Test Addon');
    await wrapper.find('[data-testid="addon-price"]').setValue(9.99);
    await wrapper.find('[data-testid="addon-billing"]').setValue('MONTHLY');

    // Check a plan
    const cb1 = wrapper.find('[data-testid="plan-checkbox-plan-1"]');
    await cb1.trigger('change');
    await flushPromises();

    await wrapper.find('[data-testid="submit-button"]').trigger('click');
    await flushPromises();

    expect(store.createAddon).toHaveBeenCalledWith(
      expect.objectContaining({ tarif_plan_ids: expect.any(Array) })
    );
  });

  it('shows no plans message when no plans available', async () => {
    const planStore = usePlanAdminStore();
    planStore.fetchPlans = vi.fn().mockResolvedValue([]);

    const wrapper = mountForm(false);
    await flushPromises();

    expect(wrapper.find('[data-testid="plan-checkboxes"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('addOns.noPlansAvailable');
  });
});
