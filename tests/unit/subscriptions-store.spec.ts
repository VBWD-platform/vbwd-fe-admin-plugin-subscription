import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSubscriptionsStore } from '../../src/stores/subscriptions';
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

describe('SubscriptionsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('initializes with empty state', () => {
    const store = useSubscriptionsStore();

    expect(store.subscriptions).toEqual([]);
    expect(store.selectedSubscription).toBeNull();
    expect(store.total).toBe(0);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('fetches subscriptions list with pagination', async () => {
    const store = useSubscriptionsStore();

    const mockSubscriptions = [
      { id: '1', user_email: 'user1@test.com', plan_name: 'Pro', status: 'active', created_at: '2025-01-01' },
      { id: '2', user_email: 'user2@test.com', plan_name: 'Enterprise', status: 'canceled', created_at: '2025-01-02' }
    ];

    vi.mocked(api.get).mockResolvedValue({
      subscriptions: mockSubscriptions,
      total: 100,
      page: 1,
      per_page: 20
    });

    await store.fetchSubscriptions({ page: 1, per_page: 20 });

    expect(api.get).toHaveBeenCalledWith('/admin/subscriptions', {
      params: { page: 1, per_page: 20, status: '', plan: '', user_id: '' }
    });
    expect(store.subscriptions).toEqual(mockSubscriptions);
    expect(store.total).toBe(100);
  });

  it('fetches subscriptions with filters', async () => {
    const store = useSubscriptionsStore();

    vi.mocked(api.get).mockResolvedValue({ subscriptions: [], total: 0, page: 1, per_page: 20 });

    await store.fetchSubscriptions({ page: 1, per_page: 20, status: 'active', plan: 'Pro' });

    expect(api.get).toHaveBeenCalledWith('/admin/subscriptions', {
      params: { page: 1, per_page: 20, status: 'active', plan: 'Pro', user_id: '' }
    });
  });

  it('fetches single subscription details', async () => {
    const store = useSubscriptionsStore();

    const mockSubscription = {
      id: '1',
      user_id: 'user-1',
      user_email: 'user@test.com',
      user_name: 'Test User',
      plan_id: 'plan-1',
      plan_name: 'Pro',
      status: 'active',
      current_period_start: '2025-01-01',
      current_period_end: '2025-02-01',
      created_at: '2025-01-01',
      payment_history: [
        { id: 'pay-1', amount: 29.99, status: 'succeeded', created_at: '2025-01-01' }
      ]
    };

    vi.mocked(api.get).mockResolvedValue({ subscription: mockSubscription });

    await store.fetchSubscription('1');

    expect(api.get).toHaveBeenCalledWith('/admin/subscriptions/1');
    expect(store.selectedSubscription).toEqual(mockSubscription);
  });

  it('cancels subscription', async () => {
    const store = useSubscriptionsStore();

    vi.mocked(api.post).mockResolvedValue({ message: 'Subscription canceled' });

    await store.cancelSubscription('1', 'Customer requested');

    expect(api.post).toHaveBeenCalledWith('/admin/subscriptions/1/cancel', { reason: 'Customer requested' });
  });

  it('refunds subscription', async () => {
    const store = useSubscriptionsStore();

    vi.mocked(api.post).mockResolvedValue({ message: 'Refund processed' });

    await store.refundSubscription('1', 29.99, 'Refund for service issue');

    expect(api.post).toHaveBeenCalledWith('/admin/subscriptions/1/refund', {
      amount: 29.99,
      reason: 'Refund for service issue'
    });
  });

  it('extends subscription', async () => {
    const store = useSubscriptionsStore();

    vi.mocked(api.post).mockResolvedValue({ message: 'Subscription extended' });

    await store.extendSubscription('1', 30);

    expect(api.post).toHaveBeenCalledWith('/admin/subscriptions/1/extend', { days: 30 });
  });

  it('changes subscription plan', async () => {
    const store = useSubscriptionsStore();

    vi.mocked(api.put).mockResolvedValue({ message: 'Plan changed' });

    await store.changePlan('1', 'plan-2');

    expect(api.put).toHaveBeenCalledWith('/admin/subscriptions/1/plan', { plan_id: 'plan-2' });
  });

  it('handles fetch error gracefully', async () => {
    const store = useSubscriptionsStore();

    vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

    await expect(store.fetchSubscriptions({ page: 1, per_page: 20 })).rejects.toThrow();
    expect(store.error).toBe('Network error');
  });

  it('resets store state', () => {
    const store = useSubscriptionsStore();
    store.subscriptions = [{ id: '1', user_email: 'test@test.com', plan_name: 'Pro', status: 'ACTIVE' }];
    store.selectedSubscription = { id: '1', user_email: 'test@test.com', plan_name: 'Pro', status: 'ACTIVE' };
    store.error = 'Some error';

    store.reset();

    expect(store.subscriptions).toEqual([]);
    expect(store.selectedSubscription).toBeNull();
    expect(store.error).toBeNull();
  });

  it('computes hasSubscriptions correctly', async () => {
    const store = useSubscriptionsStore();

    expect(store.hasSubscriptions).toBe(false);

    vi.mocked(api.get).mockResolvedValue({
      subscriptions: [{ id: '1', user_email: 'user@test.com', plan_name: 'Pro', status: 'active' }],
      total: 1,
      page: 1,
      per_page: 20
    });

    await store.fetchSubscriptions({ page: 1, per_page: 20 });

    expect(store.hasSubscriptions).toBe(true);
  });
});
