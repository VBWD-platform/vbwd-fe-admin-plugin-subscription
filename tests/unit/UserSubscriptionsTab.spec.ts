import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import UserSubscriptionsTab from '../../src/components/UserSubscriptionsTab.vue';
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

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}));

const mockSubscriptions = [
  { id: 'sub-1', user_id: '1', plan_name: 'Pro', status: 'ACTIVE', created_at: '2026-01-01T00:00:00' },
  { id: 'sub-2', user_id: '1', plan_name: 'Enterprise', status: 'CANCELLED', created_at: '2026-02-01T00:00:00' }
];

function setupApiMocks(payload: unknown = { subscriptions: mockSubscriptions, total: 2, page: 1, per_page: 10 }) {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/admin/subscriptions') {
      return Promise.resolve(payload);
    }
    return Promise.resolve({});
  });
}

function mountTab(active = true) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/subscriptions/:id', name: 'subscription-details', component: { template: '<div>Sub</div>' } },
    ]
  });
  return mount(UserSubscriptionsTab, {
    props: { userId: '1', active },
    global: {
      plugins: [router],
      mocks: { $t: (key: string) => key }
    }
  });
}

describe('UserSubscriptionsTab (plugin)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('lazy-loads subscriptions for the user when active', async () => {
    setupApiMocks();
    mountTab(true);
    await flushPromises();
    expect(api.get).toHaveBeenCalledWith('/admin/subscriptions', {
      params: { page: 1, per_page: 10, status: '', plan: '', user_id: '1' }
    });
  });

  it('does not fetch while inactive, then fetches on activation', async () => {
    setupApiMocks();
    const wrapper = mountTab(false);
    await flushPromises();
    expect(api.get).not.toHaveBeenCalled();

    await wrapper.setProps({ active: true });
    await flushPromises();
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('renders the user subscriptions in the table', async () => {
    setupApiMocks();
    const wrapper = mountTab(true);
    await flushPromises();

    const table = wrapper.find('[data-testid="user-subscriptions-table"]');
    expect(table.exists()).toBe(true);

    const rows = table.findAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('Pro');
    expect(rows[1].text()).toContain('Enterprise');
  });

  it('shows the empty state when the user has no subscriptions', async () => {
    setupApiMocks({ subscriptions: [], total: 0, page: 1, per_page: 10 });
    const wrapper = mountTab(true);
    await flushPromises();

    const empty = wrapper.find('[data-testid="subscriptions-empty-state"]');
    expect(empty.exists()).toBe(true);
    expect(empty.text()).toContain('subscriptions.noSubscriptionsForUser');
  });

  it('navigates to the subscription detail on row click', async () => {
    setupApiMocks();
    const wrapper = mountTab(true);
    await flushPromises();

    const router = wrapper.vm.$router;
    const pushSpy = vi.spyOn(router, 'push');

    await wrapper.find('[data-testid="user-subscriptions-table"] tbody tr').trigger('click');
    expect(pushSpy).toHaveBeenCalledWith('/admin/subscriptions/sub-1');
  });
});
