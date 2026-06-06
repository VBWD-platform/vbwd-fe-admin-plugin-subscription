import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import Plans from '../../src/views/Plans.vue';
import { api } from '@/api';
import { configureAuthStore, useAuthStore } from '@/stores/auth';

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

describe('Plans.vue', () => {
  let router: ReturnType<typeof createRouter>;

  const mockPlans = [
    {
      id: '1',
      name: 'Free',
      price: { currency_code: 'USD' },
      price_float: 0,
      billing_period: 'monthly',
      features: ['Basic features'],
      is_active: true,
      subscriber_count: 150,
      created_at: '2025-01-01'
    },
    {
      id: '2',
      name: 'Pro',
      price: { currency_code: 'USD' },
      price_float: 29.99,
      billing_period: 'monthly',
      features: ['All features', 'Priority support'],
      is_active: true,
      subscriber_count: 50,
      created_at: '2025-01-02'
    },
    {
      id: '3',
      name: 'Enterprise',
      price: { currency_code: 'USD' },
      price_float: 99.99,
      billing_period: 'monthly',
      features: ['Everything', 'Dedicated support'],
      is_active: false,
      subscriber_count: 10,
      created_at: '2025-01-03'
    }
  ];

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

    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', redirect: '/admin/plans' },
        { path: '/admin/plans', name: 'plans', component: Plans },
        { path: '/admin/plans/new', name: 'plan-new', component: { template: '<div>New Plan</div>' } },
        { path: '/admin/plans/:id', name: 'plan-details', component: { template: '<div>Plan Details</div>' } },
        { path: '/admin/plans/:id/edit', name: 'plan-edit', component: { template: '<div>Plan Edit</div>' } }
      ]
    });

    // Default mock response
    vi.mocked(api.get).mockResolvedValue({ plans: mockPlans });
  });

  it('renders plans table with data', async () => {
    const wrapper = mount(Plans, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="plans-table"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Name');
    expect(wrapper.text()).toContain('Price');
    expect(wrapper.text()).toContain('Billing');
    expect(wrapper.text()).toContain('Status');
  });

  it('displays plan data in table rows', async () => {
    const wrapper = mount(Plans, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.text()).toContain('Free');
    expect(wrapper.text()).toContain('Pro');
    expect(wrapper.text()).toContain('$29.99');
    expect(wrapper.text()).toContain('monthly');
  });

  it('shows loading state while fetching plans', async () => {
    vi.mocked(api.get).mockImplementation(() => new Promise(() => {}));

    const wrapper = mount(Plans, {
      global: {
        plugins: [router]
      }
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-testid="loading-spinner"]').exists()).toBe(true);
  });

  it('displays active/inactive status badges', async () => {
    const wrapper = mount(Plans, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    const activeBadges = wrapper.findAll('[data-testid="status-active"]');
    const inactiveBadges = wrapper.findAll('[data-testid="status-inactive"]');

    expect(activeBadges.length).toBe(2); // Free and Pro
    expect(inactiveBadges.length).toBe(1); // Enterprise
  });

  it('displays subscriber count for each plan', async () => {
    const wrapper = mount(Plans, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.text()).toContain('150');
    expect(wrapper.text()).toContain('50');
    expect(wrapper.text()).toContain('10');
  });

  it('navigates to create new plan page', async () => {
    await router.push('/admin/plans');

    const wrapper = mount(Plans, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    const createBtn = wrapper.find('[data-testid="create-plan-button"]');
    await createBtn.trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/admin/plans/new');
  });

  it('navigates to plan details on row click', async () => {
    await router.push('/admin/plans');

    const wrapper = mount(Plans, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    const nameCell = wrapper.find('[data-testid="plan-row-1"] td:nth-child(2)');
    await nameCell.trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/admin/plans/1/edit');
  });

  it('can archive an active plan', async () => {
    vi.mocked(api.post).mockResolvedValue({ message: 'Plan archived' });

    const wrapper = mount(Plans, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    const archiveBtn = wrapper.find('[data-testid="archive-plan-1"]');
    await archiveBtn.trigger('click');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/admin/tarif-plans/1/archive');
  });

  it('displays error message on fetch failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(api.get).mockRejectedValue(new Error('Failed to fetch plans'));

    const wrapper = mount(Plans, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="error-message"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Failed to fetch plans');

    consoleSpy.mockRestore();
  });

  it('shows empty state when no plans found', async () => {
    vi.mocked(api.get).mockResolvedValue({ plans: [] });

    const wrapper = mount(Plans, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="empty-state"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('No results found');
  });

  it('can filter to include archived plans', async () => {
    const wrapper = mount(Plans, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();
    vi.clearAllMocks();

    const checkbox = wrapper.find('[data-testid="include-archived"]');
    await checkbox.setValue(true);
    await flushPromises();

    expect(api.get).toHaveBeenCalledWith('/admin/tarif-plans', {
      params: { include_archived: true }
    });
  });

  describe('bulk copy', () => {
    it('does not show the bulk copy button when no plans are selected', async () => {
      const wrapper = mount(Plans, {
        global: {
          plugins: [router]
        }
      });

      await flushPromises();

      expect(wrapper.find('[data-testid="bulk-copy-btn"]').exists()).toBe(false);
    });

    it('shows the bulk copy button when at least one plan is selected', async () => {
      const wrapper = mount(Plans, {
        global: {
          plugins: [router]
        }
      });

      await flushPromises();

      await wrapper.find('[data-testid="select-plan-1"]').setValue(true);
      await flushPromises();

      expect(wrapper.find('[data-testid="bulk-copy-btn"]').exists()).toBe(true);
    });

    it('copies each selected plan once, then refreshes and shows a success message', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      vi.mocked(api.post).mockResolvedValue({ plan: { id: 'copy-1' } });

      const wrapper = mount(Plans, {
        global: {
          plugins: [router]
        }
      });

      await flushPromises();

      await wrapper.find('[data-testid="select-plan-1"]').setValue(true);
      await wrapper.find('[data-testid="select-plan-2"]').setValue(true);
      await flushPromises();

      vi.mocked(api.get).mockClear();

      await wrapper.find('[data-testid="bulk-copy-btn"]').trigger('click');
      await flushPromises();

      // copyPlan -> POST /admin/tarif-plans/<id>/copy once per selected id
      expect(api.post).toHaveBeenCalledWith('/admin/tarif-plans/1/copy');
      expect(api.post).toHaveBeenCalledWith('/admin/tarif-plans/2/copy');
      expect(vi.mocked(api.post).mock.calls.filter(call => String(call[0]).endsWith('/copy')).length).toBe(2);

      // list refreshed
      expect(api.get).toHaveBeenCalledWith('/admin/tarif-plans', {
        params: { include_archived: false }
      });

      // success message shown
      expect(wrapper.find('[data-testid="bulk-success-message"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="bulk-success-message"]').text()).toContain('2');

      confirmSpy.mockRestore();
    });

    it('exposes copy only via the bulk bar — no per-row copy button', async () => {
      const wrapper = mount(Plans, {
        global: {
          plugins: [router]
        }
      });

      await flushPromises();

      // No per-row copy/duplicate buttons anywhere in the list.
      expect(wrapper.find('[data-testid="copy-plan-1"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="duplicate-plan-1"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="copy-button"]').exists()).toBe(false);
    });
  });
});
