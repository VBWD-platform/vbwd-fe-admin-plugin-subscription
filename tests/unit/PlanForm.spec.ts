import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import PlanForm from '../../src/views/PlanForm.vue';
import { api } from '@/api';
import { configureAuthStore, useAuthStore } from '@/stores/auth';
import { __resetTaxOptionsCache } from '@/composables/useTaxOptions';

const taxRates = [
  { id: 'tax-1', code: 'VAT19', name: 'Standard VAT', rate: '19.00', is_active: true },
  { id: 'tax-2', code: 'OLD', name: 'Retired', rate: '7.00', is_active: false },
];

// Mock the API module
vi.mock('@/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn()
  },
  initializeApi: vi.fn(),
  clearApiAuth: vi.fn()
}));

describe('PlanForm.vue', () => {
  let router: ReturnType<typeof createRouter>;

  const mockPlan = {
    id: '1',
    name: 'Pro Plan',
    price: 29.99,
    currency: 'USD',
    billing_period: 'monthly',
    features: ['Feature 1', 'Feature 2'],
    limits: { users: 10 },
    is_active: true,
    created_at: '2025-01-01'
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    configureAuthStore({
      storageKey: 'test_token',
      apiClient: api as Parameters<typeof configureAuthStore>[0]['apiClient'],
    });
    const authStore = useAuthStore();
    authStore.$patch({
      user: { id: '1', email: 'admin@test.com', role: 'SUPER_ADMIN', permissions: ['*'] },
      token: 'test-token',
    });
    vi.clearAllMocks();
    __resetTaxOptionsCache();

    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/admin/plans', name: 'plans', component: { template: '<div>Plans</div>' } },
        { path: '/admin/plans/new', name: 'plan-new', component: PlanForm },
        { path: '/admin/plans/:id', name: 'plan-details', component: PlanForm }
      ]
    });
  });

  describe('Create Mode', () => {
    it('shows create form with empty fields', async () => {
      await router.push('/admin/plans/new');

      const wrapper = mount(PlanForm, {
        global: {
          plugins: [router]
        }
      });

      await flushPromises();

      expect(wrapper.find('[data-testid="plan-form"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="form-title"]').text()).toContain('Create');

      const nameInput = wrapper.find('[data-testid="plan-name"]');
      expect((nameInput.element as HTMLInputElement).value).toBe('');
    });

    it('validates required fields before submit', async () => {
      await router.push('/admin/plans/new');

      const wrapper = mount(PlanForm, {
        global: {
          plugins: [router]
        }
      });

      await flushPromises();

      // Try to submit empty form
      const submitBtn = wrapper.find('[data-testid="submit-button"]');
      await submitBtn.trigger('click');
      await flushPromises();

      expect(wrapper.find('[data-testid="validation-error"]').exists()).toBe(true);
      expect(api.post).not.toHaveBeenCalled();
    });

    it('creates plan with valid data', async () => {
      vi.mocked(api.post).mockResolvedValue({ plan_id: 'new-plan-id' });

      await router.push('/admin/plans/new');

      const wrapper = mount(PlanForm, {
        global: {
          plugins: [router]
        }
      });

      await flushPromises();

      // Fill form
      await wrapper.find('[data-testid="plan-name"]').setValue('New Plan');
      await wrapper.find('[data-testid="plan-price"]').setValue('19.99');
      await wrapper.find('[data-testid="plan-billing"]').setValue('MONTHLY');

      // Submit
      await wrapper.find('[data-testid="submit-button"]').trigger('click');
      await flushPromises();

      expect(api.post).toHaveBeenCalledWith('/admin/tarif-plans', expect.objectContaining({
        name: 'New Plan',
        price: 19.99,
        billing_period: 'MONTHLY'
      }));
    });

    it('navigates back to plans list after creation', async () => {
      vi.mocked(api.post).mockResolvedValue({ plan_id: 'new-plan-id' });

      await router.push('/admin/plans/new');

      const wrapper = mount(PlanForm, {
        global: {
          plugins: [router]
        }
      });

      await flushPromises();

      await wrapper.find('[data-testid="plan-name"]').setValue('New Plan');
      await wrapper.find('[data-testid="plan-price"]').setValue('19.99');
      await wrapper.find('[data-testid="plan-billing"]').setValue('MONTHLY');

      await wrapper.find('[data-testid="submit-button"]').trigger('click');
      await flushPromises();

      expect(router.currentRoute.value.path).toBe('/admin/plans');
    });
  });

  describe('Edit Mode', () => {
    beforeEach(() => {
      vi.mocked(api.get).mockResolvedValue({ plan: mockPlan });
    });

    it('loads existing plan data in edit mode', async () => {
      await router.push('/admin/plans/1');

      const wrapper = mount(PlanForm, {
        global: {
          plugins: [router]
        }
      });

      await flushPromises();

      expect(api.get).toHaveBeenCalledWith('/admin/tarif-plans/1');
      expect(wrapper.find('[data-testid="form-title"]').text()).toContain('Edit');

      const nameInput = wrapper.find('[data-testid="plan-name"]');
      expect((nameInput.element as HTMLInputElement).value).toBe('Pro Plan');
    });

    it('updates plan with modified data', async () => {
      vi.mocked(api.put).mockResolvedValue({ message: 'Plan updated' });

      await router.push('/admin/plans/1');

      const wrapper = mount(PlanForm, {
        global: {
          plugins: [router]
        }
      });

      await flushPromises();

      // Modify name
      await wrapper.find('[data-testid="plan-name"]').setValue('Updated Plan');

      // Submit
      await wrapper.find('[data-testid="submit-button"]').trigger('click');
      await flushPromises();

      expect(api.put).toHaveBeenCalledWith('/admin/tarif-plans/1', expect.objectContaining({
        name: 'Updated Plan'
      }));
    });

    it('shows loading state while fetching plan', async () => {
      vi.mocked(api.get).mockImplementation(() => new Promise(() => {}));

      await router.push('/admin/plans/1');

      const wrapper = mount(PlanForm, {
        global: {
          plugins: [router]
        }
      });

      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-testid="loading-spinner"]').exists()).toBe(true);
    });

    it('shows error state on fetch failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(api.get).mockRejectedValue(new Error('Plan not found'));

      await router.push('/admin/plans/1');

      const wrapper = mount(PlanForm, {
        global: {
          plugins: [router]
        }
      });

      await flushPromises();

      expect(wrapper.find('[data-testid="error-message"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('Plan not found');

      consoleSpy.mockRestore();
    });
  });

  describe('Common functionality', () => {
    it('has cancel button that navigates back', async () => {
      await router.push('/admin/plans/new');

      const wrapper = mount(PlanForm, {
        global: {
          plugins: [router]
        }
      });

      await flushPromises();

      const cancelBtn = wrapper.find('[data-testid="cancel-button"]');
      await cancelBtn.trigger('click');
      await flushPromises();

      expect(router.currentRoute.value.path).toBe('/admin/plans');
    });

    it('displays error message on submit failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(api.post).mockRejectedValue(new Error('Failed to create plan'));

      await router.push('/admin/plans/new');

      const wrapper = mount(PlanForm, {
        global: {
          plugins: [router]
        }
      });

      await flushPromises();

      await wrapper.find('[data-testid="plan-name"]').setValue('New Plan');
      await wrapper.find('[data-testid="plan-price"]').setValue('19.99');
      await wrapper.find('[data-testid="plan-billing"]').setValue('MONTHLY');

      await wrapper.find('[data-testid="submit-button"]').trigger('click');
      await flushPromises();

      expect(wrapper.find('[data-testid="submit-error"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('Failed to create plan');

      consoleSpy.mockRestore();
    });

    it('shows loading state during submission', async () => {
      vi.mocked(api.post).mockImplementation(() => new Promise(() => {}));

      await router.push('/admin/plans/new');

      const wrapper = mount(PlanForm, {
        global: {
          plugins: [router]
        }
      });

      await flushPromises();

      await wrapper.find('[data-testid="plan-name"]').setValue('New Plan');
      await wrapper.find('[data-testid="plan-price"]').setValue('19.99');
      await wrapper.find('[data-testid="plan-billing"]').setValue('MONTHLY');

      await wrapper.find('[data-testid="submit-button"]').trigger('click');
      await wrapper.vm.$nextTick();

      const submitBtn = wrapper.find('[data-testid="submit-button"]');
      expect(submitBtn.attributes('disabled')).toBeDefined();
    });
  });

  describe('Taxes block (S72.3)', () => {
    function mockApiByUrl(plan: Record<string, unknown> | null): void {
      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url === '/admin/tax/rates') return Promise.resolve({ rates: taxRates });
        if (url.startsWith('/admin/tarif-plans/')) return Promise.resolve({ plan });
        return Promise.resolve({});
      });
    }

    it('lists active taxes from /admin/tax/rates in the Details tab', async () => {
      mockApiByUrl(null);
      await router.push('/admin/plans/new');

      const wrapper = mount(PlanForm, { global: { plugins: [router] } });
      await flushPromises();

      const taxBlock = wrapper.find('[data-testid="plan-taxes-section"]');
      expect(taxBlock.exists()).toBe(true);
      // Active tax appears as an available option; the inactive one is filtered out.
      expect(wrapper.find('[data-testid="dual-list-available-tax-1"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="dual-list-available-tax-2"]').exists()).toBe(false);
    });

    it('pre-selects the plan\'s assigned tax_ids on edit', async () => {
      mockApiByUrl({ ...mockPlan, tax_ids: ['tax-1'] });
      await router.push('/admin/plans/1');

      const wrapper = mount(PlanForm, { global: { plugins: [router] } });
      await flushPromises();

      expect(wrapper.find('[data-testid="dual-list-assigned-tax-1"]').exists()).toBe(true);
    });

    it('sends tax_ids in the create payload', async () => {
      mockApiByUrl(null);
      vi.mocked(api.post).mockResolvedValue({ plan_id: 'new-plan-id' });
      await router.push('/admin/plans/new');

      const wrapper = mount(PlanForm, { global: { plugins: [router] } });
      await flushPromises();

      await wrapper.find('[data-testid="plan-name"]').setValue('New Plan');
      await wrapper.find('[data-testid="plan-price"]').setValue('19.99');
      await wrapper.find('[data-testid="plan-billing"]').setValue('MONTHLY');
      await wrapper.find('[data-testid="dual-list-assign-tax-1"]').trigger('click');

      await wrapper.find('[data-testid="submit-button"]').trigger('click');
      await flushPromises();

      expect(api.post).toHaveBeenCalledWith('/admin/tarif-plans', expect.objectContaining({
        tax_ids: ['tax-1'],
      }));
    });

    it('sends the edited tax_ids in the update payload', async () => {
      mockApiByUrl({ ...mockPlan, tax_ids: ['tax-1'] });
      vi.mocked(api.put).mockResolvedValue({ message: 'updated' });
      await router.push('/admin/plans/1');

      const wrapper = mount(PlanForm, { global: { plugins: [router] } });
      await flushPromises();

      // Remove the pre-selected tax.
      await wrapper.find('[data-testid="dual-list-unassign-tax-1"]').trigger('click');
      await wrapper.find('[data-testid="submit-button"]').trigger('click');
      await flushPromises();

      expect(api.put).toHaveBeenCalledWith('/admin/tarif-plans/1', expect.objectContaining({
        tax_ids: [],
      }));
    });
  });

  describe('Price display override (S72.4)', () => {
    function mockApiByUrl(plan: Record<string, unknown> | null): void {
      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url === '/admin/tax/rates') return Promise.resolve({ rates: taxRates });
        if (url.startsWith('/admin/tarif-plans/')) return Promise.resolve({ plan });
        return Promise.resolve({});
      });
    }

    it('defaults to Inherit (empty) when price_display_mode is null', async () => {
      mockApiByUrl(null);
      await router.push('/admin/plans/new');

      const wrapper = mount(PlanForm, { global: { plugins: [router] } });
      await flushPromises();

      const select = wrapper.find('[data-testid="plan-price-display-mode"]');
      expect(select.exists()).toBe(true);
      // The Inherit option (empty value) is the default selection.
      expect((select.element as HTMLSelectElement).selectedIndex).toBe(0);
    });

    it('pre-selects the plan\'s price_display_mode on edit', async () => {
      mockApiByUrl({ ...mockPlan, price_display_mode: 'netto' });
      await router.push('/admin/plans/1');

      const wrapper = mount(PlanForm, { global: { plugins: [router] } });
      await flushPromises();

      const select = wrapper.find('[data-testid="plan-price-display-mode"]');
      expect((select.element as HTMLSelectElement).value).toBe('netto');
    });

    it('sends price_display_mode=null when Inherit is selected', async () => {
      mockApiByUrl(null);
      vi.mocked(api.post).mockResolvedValue({ plan_id: 'new-plan-id' });
      await router.push('/admin/plans/new');

      const wrapper = mount(PlanForm, { global: { plugins: [router] } });
      await flushPromises();

      await wrapper.find('[data-testid="plan-name"]').setValue('New Plan');
      await wrapper.find('[data-testid="plan-price"]').setValue('19.99');
      await wrapper.find('[data-testid="plan-billing"]').setValue('MONTHLY');

      await wrapper.find('[data-testid="submit-button"]').trigger('click');
      await flushPromises();

      expect(api.post).toHaveBeenCalledWith('/admin/tarif-plans', expect.objectContaining({
        price_display_mode: null,
      }));
    });

    it('sends the selected override in the update payload', async () => {
      mockApiByUrl({ ...mockPlan, price_display_mode: null });
      vi.mocked(api.put).mockResolvedValue({ message: 'updated' });
      await router.push('/admin/plans/1');

      const wrapper = mount(PlanForm, { global: { plugins: [router] } });
      await flushPromises();

      await wrapper.find('[data-testid="plan-price-display-mode"]').setValue('brutto');
      await wrapper.find('[data-testid="submit-button"]').trigger('click');
      await flushPromises();

      expect(api.put).toHaveBeenCalledWith('/admin/tarif-plans/1', expect.objectContaining({
        price_display_mode: 'brutto',
      }));
    });
  });
});
