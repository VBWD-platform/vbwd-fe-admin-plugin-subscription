import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import SubscriptionDetails from '../../src/views/SubscriptionDetails.vue';
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

describe('SubscriptionDetails.vue', () => {
  let router: ReturnType<typeof createRouter>;

  const mockSubscription = {
    id: '1',
    user_id: 'user-1',
    user_email: 'user@test.com',
    user_name: 'Test User',
    plan_id: 'plan-1',
    plan_name: 'Pro',
    status: 'ACTIVE',
    current_period_start: '2025-01-01T00:00:00Z',
    current_period_end: '2025-02-01T00:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
    payment_history: [
      { id: 'pay-1', amount: 29.99, currency: 'USD', status: 'succeeded', created_at: '2025-01-01T10:00:00Z' },
      { id: 'pay-2', amount: 29.99, currency: 'USD', status: 'succeeded', created_at: '2024-12-01T10:00:00Z' }
    ]
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

    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/admin/subscriptions', name: 'subscriptions', component: { template: '<div>Subscriptions</div>' } },
        { path: '/admin/subscriptions/:id', name: 'subscription-details', component: SubscriptionDetails }
      ]
    });

    // Default mock response
    vi.mocked(api.get).mockResolvedValue({ subscription: mockSubscription });
  });

  it('fetches subscription details on mount', async () => {
    await router.push('/admin/subscriptions/1');

    mount(SubscriptionDetails, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(api.get).toHaveBeenCalledWith('/admin/subscriptions/1');
  });

  it('displays subscription information', async () => {
    await router.push('/admin/subscriptions/1');

    const wrapper = mount(SubscriptionDetails, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.text()).toContain('user@test.com');
    expect(wrapper.text()).toContain('Test User');
    expect(wrapper.text()).toContain('Pro');
  });

  it('displays subscription status badge', async () => {
    await router.push('/admin/subscriptions/1');

    const wrapper = mount(SubscriptionDetails, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="status-active"]').exists()).toBe(true);
  });

  it('displays billing period dates', async () => {
    await router.push('/admin/subscriptions/1');

    const wrapper = mount(SubscriptionDetails, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="billing-period"]').exists()).toBe(true);
  });

  it('displays payment history', async () => {
    await router.push('/admin/subscriptions/1');

    const wrapper = mount(SubscriptionDetails, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="payment-history"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('$29.99');
  });

  it('can cancel active subscription', async () => {
    vi.mocked(api.post).mockResolvedValue({ message: 'Subscription canceled' });

    await router.push('/admin/subscriptions/1');

    const wrapper = mount(SubscriptionDetails, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    const cancelBtn = wrapper.find('[data-testid="cancel-button"]');
    await cancelBtn.trigger('click');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/admin/subscriptions/1/cancel', expect.any(Object));
  });

  it('hides cancel button for canceled subscriptions', async () => {
    vi.mocked(api.get).mockResolvedValue({
      subscription: { ...mockSubscription, status: 'canceled' }
    });

    await router.push('/admin/subscriptions/1');

    const wrapper = mount(SubscriptionDetails, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="cancel-button"]').exists()).toBe(false);
  });

  it('navigates back to subscriptions list', async () => {
    await router.push('/admin/subscriptions/1');

    const wrapper = mount(SubscriptionDetails, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    const backBtn = wrapper.find('[data-testid="back-button"]');
    await backBtn.trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/admin/subscriptions');
  });

  it('shows loading state while fetching', async () => {
    vi.mocked(api.get).mockImplementation(() => new Promise(() => {}));

    await router.push('/admin/subscriptions/1');

    const wrapper = mount(SubscriptionDetails, {
      global: {
        plugins: [router]
      }
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-testid="loading-spinner"]').exists()).toBe(true);
  });

  it('shows error state on fetch failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(api.get).mockRejectedValue(new Error('Subscription not found'));

    await router.push('/admin/subscriptions/1');

    const wrapper = mount(SubscriptionDetails, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="error-message"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Subscription not found');

    consoleSpy.mockRestore();
  });
});
