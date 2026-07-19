import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import { setOperatingCurrency } from 'vbwd-view-component';
import Plans from '../../src/views/Plans.vue';
import AddOns from '../../src/views/AddOns.vue';
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
    clearToken: vi.fn(),
  },
  initializeApi: vi.fn(),
  clearApiAuth: vi.fn(),
}));

// AddOns.vue uses vue-i18n; stub `t` so price-cell formatting is the only
// variable under test.
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

/**
 * S99.3 regression: the subscription-admin price cells must format money via
 * fe-core `formatMoney`, so the rendered currency follows the value's own
 * currency (when present) else the operating currency — never a hard-coded
 * `$`. These tests fail against the old `currency === 'USD' ? '$' : ...`
 * symbol maps because those ignore the operating currency entirely.
 */
describe('subscription-admin price cells follow the operating currency (S99.3)', () => {
  let router: ReturnType<typeof createRouter>;

  function makeRouter(): ReturnType<typeof createRouter> {
    return createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', redirect: '/admin/plans' },
        { path: '/admin/plans', name: 'plans', component: { template: '<div />' } },
        { path: '/admin/plans/new', name: 'plan-new', component: { template: '<div />' } },
        { path: '/admin/plans/:id', name: 'plan-details', component: { template: '<div />' } },
        { path: '/admin/plans/:id/edit', name: 'plan-edit', component: { template: '<div />' } },
        { path: '/admin/addons', name: 'addons', component: { template: '<div />' } },
        { path: '/admin/addons/new', name: 'addon-new', component: { template: '<div />' } },
        { path: '/admin/addons/:id', name: 'addon-details', component: { template: '<div />' } },
        { path: '/admin/addons/:id/edit', name: 'addon-edit', component: { template: '<div />' } },
      ],
    });
  }

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
    router = makeRouter();
  });

  afterEach(() => {
    // Reset the process-global operating currency so tests don't leak into
    // each other.
    setOperatingCurrency('EUR');
  });

  it('uses the plan price\'s own currency code (USD -> $)', async () => {
    setOperatingCurrency('EUR');
    vi.mocked(api.get).mockResolvedValue({
      plans: [
        {
          id: '1',
          name: 'Pro',
          price: { currency_code: 'USD' },
          price_float: 29.99,
          billing_period: 'monthly',
          is_active: true,
          subscriber_count: 0,
          created_at: '2025-01-01',
        },
      ],
    });

    const wrapper = mount(Plans, { global: { plugins: [router] } });
    await flushPromises();

    expect(wrapper.text()).toContain('$29.99');
  });

  it('renders the price from the REAL admin wire shape (plain number `price`, no `price_float`)', async () => {
    setOperatingCurrency('EUR');
    vi.mocked(api.get).mockResolvedValue({
      plans: [
        {
          id: '1',
          name: 'Pro',
          // Real admin API shape: `price` is a plain number, no `price_float`,
          // no object price, no top-level currency.
          price: 29.99,
          billing_period: 'monthly',
          is_active: true,
          subscriber_count: 0,
          created_at: '2025-01-01',
        },
      ],
    });

    const wrapper = mount(Plans, { global: { plugins: [router] } });
    await flushPromises();

    expect(wrapper.text()).toContain('€29.99');
    expect(wrapper.text()).not.toContain('N/A');
  });

  it('falls back to the operating currency when the addon has none', async () => {
    setOperatingCurrency('USD');
    vi.mocked(api.get).mockResolvedValue({
      items: [
        {
          id: '1',
          name: 'Extra seats',
          slug: 'extra-seats',
          price: 10,
          // no `currency` on the addon -> must follow operating currency
          billing_period: 'monthly',
          is_active: true,
          tarif_plans: [],
        },
      ],
      total: 1,
    });

    const wrapper = mount(AddOns, { global: { plugins: [router] } });
    await flushPromises();

    expect(wrapper.text()).toContain('$10.00');
    expect(wrapper.text()).not.toContain('€10.00');
  });

  it('the same addon follows EUR when the operating currency is EUR', async () => {
    setOperatingCurrency('EUR');
    vi.mocked(api.get).mockResolvedValue({
      items: [
        {
          id: '1',
          name: 'Extra seats',
          slug: 'extra-seats',
          price: 10,
          billing_period: 'monthly',
          is_active: true,
          tarif_plans: [],
        },
      ],
      total: 1,
    });

    const wrapper = mount(AddOns, { global: { plugins: [router] } });
    await flushPromises();

    expect(wrapper.text()).toContain('€10.00');
    expect(wrapper.text()).not.toContain('$10.00');
  });
});
