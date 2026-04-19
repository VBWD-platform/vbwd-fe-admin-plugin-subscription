import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import type { Pinia } from 'pinia';
import AddOns from '../../src/views/AddOns.vue';
import { api } from '@/api';
import { configureAuthStore, useAuthStore } from '@/stores/auth';

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

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}));

const mockPush = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush
  })
}));

const mockAddons = [
  {
    id: '1',
    name: 'Priority Support',
    slug: 'priority-support',
    description: 'Priority support add-on',
    price: '9.99',
    currency: 'EUR',
    billing_period: 'monthly',
    config: {},
    is_active: true,
    sort_order: 1,
    tarif_plan_ids: [],
    tarif_plans: [],
    created_at: '2026-01-01',
    updated_at: '2026-01-01'
  },
  {
    id: '2',
    name: 'Extra Storage',
    slug: 'extra-storage',
    description: 'Extra storage add-on',
    price: '4.99',
    currency: 'USD',
    billing_period: 'yearly',
    config: {},
    is_active: false,
    sort_order: 2,
    tarif_plan_ids: ['plan-1'],
    tarif_plans: [{ id: 'plan-1', name: 'Basic' }],
    created_at: '2026-01-01',
    updated_at: '2026-01-01'
  }
];

let pinia: Pinia;

function mountWithData(items = mockAddons, total = items.length) {
  vi.mocked(api.get).mockResolvedValue({ items, total });
  return mount(AddOns, {
    global: {
      plugins: [pinia],
      mocks: {
        $t: (key: string) => key
      }
    }
  });
}

function mountEmpty() {
  vi.mocked(api.get).mockResolvedValue({ items: [], total: 0 });
  return mount(AddOns, {
    global: {
      plugins: [pinia],
      mocks: {
        $t: (key: string) => key
      }
    }
  });
}

function mountLoading() {
  // Never resolve to keep loading state
  vi.mocked(api.get).mockReturnValue(new Promise(() => {}));
  return mount(AddOns, {
    global: {
      plugins: [pinia],
      mocks: {
        $t: (key: string) => key
      }
    }
  });
}

function mountError() {
  vi.mocked(api.get).mockRejectedValue(new Error('Failed to fetch'));
  return mount(AddOns, {
    global: {
      plugins: [pinia],
      mocks: {
        $t: (key: string) => key
      }
    }
  });
}

describe('AddOns View', () => {
  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
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
  });

  it('renders addons table with data', async () => {
    const wrapper = mountWithData();
    await flushPromises();

    expect(wrapper.find('[data-testid="addons-table"]').exists()).toBe(true);
    expect(wrapper.findAll('.addon-row')).toHaveLength(2);
  });

  it('shows loading spinner', async () => {
    const wrapper = mountLoading();
    // Allow onMounted to fire and store.loading to propagate
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-testid="loading-spinner"]').exists()).toBe(true);
  });

  it('shows error message', async () => {
    const wrapper = mountError();
    await flushPromises();

    expect(wrapper.find('[data-testid="error-message"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="error-message"]').text()).toContain('Failed to fetch');
  });

  it('shows empty state', async () => {
    const wrapper = mountEmpty();
    await flushPromises();

    expect(wrapper.find('[data-testid="empty-state"]').exists()).toBe(true);
  });

  it('create button navigates to new', async () => {
    const wrapper = mountEmpty();
    await flushPromises();

    await wrapper.find('[data-testid="create-addon-button"]').trigger('click');
    expect(mockPush).toHaveBeenCalledWith('/admin/add-ons/new');
  });

  it('row click navigates to edit', async () => {
    const wrapper = mountWithData();
    await flushPromises();

    await wrapper.find('[data-testid="addon-row-1"]').trigger('click');
    expect(mockPush).toHaveBeenCalledWith('/admin/add-ons/1/edit');
  });

  it('search filters addons by name', async () => {
    const wrapper = mountWithData();
    await flushPromises();

    const searchInput = wrapper.find('[data-testid="search-input"]');
    await searchInput.setValue('Priority');
    await flushPromises();

    expect(wrapper.findAll('.addon-row')).toHaveLength(1);
    expect(wrapper.text()).toContain('Priority Support');
  });

  it('displays active/inactive status badges', async () => {
    const wrapper = mountWithData();
    await flushPromises();

    expect(wrapper.find('[data-testid="status-active"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="status-inactive"]').exists()).toBe(true);
  });

  it('shows deactivate button for active addon', async () => {
    const wrapper = mountWithData();
    await flushPromises();

    expect(wrapper.find('[data-testid="deactivate-addon-1"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="activate-addon-2"]').exists()).toBe(true);
  });

  it('shows delete button for each addon', async () => {
    const wrapper = mountWithData();
    await flushPromises();

    expect(wrapper.find('[data-testid="delete-addon-1"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="delete-addon-2"]').exists()).toBe(true);
  });

  it('table has correct column headers', async () => {
    const wrapper = mountWithData();
    await flushPromises();

    const headers = wrapper.findAll('th');
    const headerTexts = headers.map(h => h.text());
    expect(headerTexts).toContain('addOns.name');
    expect(headerTexts).toContain('addOns.slug');
    expect(headerTexts).toContain('addOns.price');
    expect(headerTexts).toContain('addOns.billingPeriod');
    expect(headerTexts).toContain('common.status');
    expect(headerTexts).toContain('common.actions');
  });

  it('sort by name toggles direction', async () => {
    const wrapper = mountWithData();
    await flushPromises();

    const nameHeader = wrapper.findAll('th.sortable')[0];
    await nameHeader.trigger('click');
    await flushPromises();

    const rows = wrapper.findAll('.addon-row');
    expect(rows[0].text()).toContain('Extra Storage');
    expect(rows[1].text()).toContain('Priority Support');
  });

  // Sprint 13: Plan badge tests
  it('table has Plans column header', async () => {
    const wrapper = mountWithData();
    await flushPromises();

    const headers = wrapper.findAll('th');
    const headerTexts = headers.map(h => h.text());
    expect(headerTexts).toContain('addOns.plans');
  });

  it('shows "All Plans" badge for independent addons', async () => {
    const wrapper = mountWithData();
    await flushPromises();

    const planCells = wrapper.findAll('[data-testid="addon-plans"]');
    // First addon has no tarif_plans — should show "All Plans"
    expect(planCells[0].text()).toContain('addOns.allPlans');
    expect(planCells[0].find('.all-plans').exists()).toBe(true);
  });

  it('shows plan name badges for plan-specific addons', async () => {
    const wrapper = mountWithData();
    await flushPromises();

    const planCells = wrapper.findAll('[data-testid="addon-plans"]');
    // Second addon has tarif_plans = [{ id: 'plan-1', name: 'Basic' }]
    expect(planCells[1].text()).toContain('Basic');
    expect(planCells[1].find('.all-plans').exists()).toBe(false);
  });

  it('shows multiple plan badges when addon has multiple plans', async () => {
    const multiPlanAddons = [{
      id: '3',
      name: 'Multi Plan Addon',
      slug: 'multi-plan',
      description: '',
      price: '5.00',
      currency: 'EUR',
      billing_period: 'monthly',
      config: {},
      is_active: true,
      sort_order: 0,
      tarif_plan_ids: ['plan-1', 'plan-2'],
      tarif_plans: [{ id: 'plan-1', name: 'Basic' }, { id: 'plan-2', name: 'Pro' }],
      created_at: '2026-01-01',
      updated_at: '2026-01-01'
    }];

    const wrapper = mountWithData(multiPlanAddons);
    await flushPromises();

    const planCells = wrapper.findAll('[data-testid="addon-plans"]');
    const badges = planCells[0].findAll('.plan-badge');
    expect(badges).toHaveLength(2);
    expect(planCells[0].text()).toContain('Basic');
    expect(planCells[0].text()).toContain('Pro');
  });
});
