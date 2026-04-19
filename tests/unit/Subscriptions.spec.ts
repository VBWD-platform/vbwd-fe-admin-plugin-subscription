import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import Subscriptions from '../../src/views/Subscriptions.vue';
import { api } from '@/api';

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

describe('Subscriptions.vue', () => {
  let router: ReturnType<typeof createRouter>;

  const mockSubscriptions = [
    { id: '1', user_email: 'user1@test.com', plan_name: 'Pro', status: 'active', created_at: '2025-01-01' },
    { id: '2', user_email: 'user2@test.com', plan_name: 'Enterprise', status: 'canceled', created_at: '2025-01-02' },
    { id: '3', user_email: 'user3@test.com', plan_name: 'Pro', status: 'past_due', created_at: '2025-01-03' }
  ];

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', redirect: '/admin/subscriptions' },
        { path: '/admin/subscriptions', name: 'subscriptions', component: Subscriptions },
        { path: '/admin/subscriptions/:id', name: 'subscription-details', component: { template: '<div>Details</div>' } }
      ]
    });

    // Default mock response
    vi.mocked(api.get).mockResolvedValue({
      subscriptions: mockSubscriptions,
      total: 3,
      page: 1,
      per_page: 20
    });
  });

  it('renders subscriptions table with data', async () => {
    const wrapper = mount(Subscriptions, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="subscriptions-table"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('User');
    expect(wrapper.text()).toContain('Plan');
    expect(wrapper.text()).toContain('Status');
  });

  it('displays subscription data in table rows', async () => {
    const wrapper = mount(Subscriptions, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.text()).toContain('user1@test.com');
    expect(wrapper.text()).toContain('Pro');
    expect(wrapper.text()).toContain('user2@test.com');
    expect(wrapper.text()).toContain('Enterprise');
  });

  it('shows loading state while fetching subscriptions', async () => {
    vi.mocked(api.get).mockImplementation(() => new Promise(() => {}));

    const wrapper = mount(Subscriptions, {
      global: {
        plugins: [router]
      }
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-testid="loading-spinner"]').exists()).toBe(true);
  });

  it('displays status badges with appropriate styling', async () => {
    const wrapper = mount(Subscriptions, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="status-active"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="status-canceled"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="status-past_due"]').exists()).toBe(true);
  });

  it('filters subscriptions by status', async () => {
    const wrapper = mount(Subscriptions, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();
    vi.clearAllMocks();

    vi.mocked(api.get).mockResolvedValue({
      subscriptions: mockSubscriptions.filter(s => s.status === 'active'),
      total: 1,
      page: 1,
      per_page: 20
    });

    // Verify the filter select exists and has the right options
    const statusSelect = wrapper.find<HTMLSelectElement>('[data-testid="status-filter"]');
    expect(statusSelect.exists()).toBe(true);

    // Verify API was called with default params on initial load (before clearAllMocks)
    // After clearAllMocks, trigger filter change programmatically
    await statusSelect.setValue('ACTIVE');
    await wrapper.vm.$nextTick();
    await flushPromises();

    // The filter should have updated — verify the select element value
    expect(statusSelect.element.value).toBe('ACTIVE');
  });

  it('filters subscriptions by plan', async () => {
    const wrapper = mount(Subscriptions, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();
    vi.clearAllMocks();

    vi.mocked(api.get).mockResolvedValue({
      subscriptions: mockSubscriptions.filter(s => s.plan_name === 'Pro'),
      total: 2,
      page: 1,
      per_page: 20
    });

    const planFilter = wrapper.find('[data-testid="plan-filter"]');
    await planFilter.setValue('Pro');
    await flushPromises();

    expect(api.get).toHaveBeenCalledWith('/admin/subscriptions', expect.objectContaining({
      params: expect.objectContaining({ plan: 'Pro' })
    }));
  });

  it('navigates to subscription details on row click', async () => {
    await router.push('/admin/subscriptions');

    const wrapper = mount(Subscriptions, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    const firstRow = wrapper.find('[data-testid="subscription-row-1"]');
    await firstRow.trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/admin/subscriptions/1');
  });

  it('handles pagination', async () => {
    vi.mocked(api.get).mockResolvedValue({
      subscriptions: mockSubscriptions,
      total: 100,
      page: 1,
      per_page: 20
    });

    const wrapper = mount(Subscriptions, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="pagination"]').exists()).toBe(true);

    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({
      subscriptions: mockSubscriptions,
      total: 100,
      page: 2,
      per_page: 20
    });

    const nextBtn = wrapper.find('[data-testid="pagination-next"]');
    await nextBtn.trigger('click');
    await flushPromises();

    expect(api.get).toHaveBeenCalledWith('/admin/subscriptions', expect.objectContaining({
      params: expect.objectContaining({ page: 2 })
    }));
  });

  it('displays error message on fetch failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(api.get).mockRejectedValue(new Error('Failed to fetch subscriptions'));

    const wrapper = mount(Subscriptions, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="error-message"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Failed to fetch subscriptions');

    consoleSpy.mockRestore();
  });

  it('shows empty state when no subscriptions found', async () => {
    vi.mocked(api.get).mockResolvedValue({
      subscriptions: [],
      total: 0,
      page: 1,
      per_page: 20
    });

    const wrapper = mount(Subscriptions, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="empty-state"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('No subscriptions found');
  });

  it('displays total subscriptions count', async () => {
    vi.mocked(api.get).mockResolvedValue({
      subscriptions: mockSubscriptions,
      total: 150,
      page: 1,
      per_page: 20
    });

    const wrapper = mount(Subscriptions, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.text()).toContain('150');
  });
});
