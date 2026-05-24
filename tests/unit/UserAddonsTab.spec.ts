import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import UserAddonsTab from '../../src/components/UserAddonsTab.vue';
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

const mockAddonSubs = [
  {
    id: 'addon-sub-1',
    addon_name: 'Extra Storage',
    status: 'active',
    invoice_status: 'paid',
    first_invoice: { id: 'inv-1', invoice_number: 'INV-001', created_at: '2026-01-01T00:00:00' },
    last_invoice: { id: 'inv-1', invoice_number: 'INV-001', created_at: '2026-01-01T00:00:00' },
    starts_at: '2026-01-01T00:00:00',
    expires_at: '2027-01-01T00:00:00',
    created_at: '2026-01-01T00:00:00',
  },
  {
    id: 'addon-sub-2',
    addon_name: 'Priority Support',
    status: 'cancelled',
    invoice_status: 'paid',
    first_invoice: { id: 'inv-2', invoice_number: 'INV-002', created_at: '2026-02-01T00:00:00' },
    last_invoice: { id: 'inv-2', invoice_number: 'INV-002', created_at: '2026-02-01T00:00:00' },
    starts_at: '2026-02-01T00:00:00',
    expires_at: null,
    created_at: '2026-02-01T00:00:00',
  }
];

function setupApiMocks(addons: unknown = { addon_subscriptions: mockAddonSubs }) {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/admin/users/1/addons') {
      return Promise.resolve(addons);
    }
    return Promise.resolve({});
  });
}

function mountTab(active = true) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/invoices/:id', name: 'invoice-details', component: { template: '<div>Inv</div>' } },
    ]
  });
  return mount(UserAddonsTab, {
    props: { userId: '1', active },
    global: {
      plugins: [router],
      mocks: { $t: (key: string) => key }
    }
  });
}

describe('UserAddonsTab (plugin)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('lazy-loads add-ons when the tab is active', async () => {
    setupApiMocks();
    mountTab(true);
    await flushPromises();
    expect(api.get).toHaveBeenCalledWith('/admin/users/1/addons');
  });

  it('does not fetch while inactive, then fetches on activation', async () => {
    setupApiMocks();
    const wrapper = mountTab(false);
    await flushPromises();
    expect(api.get).not.toHaveBeenCalled();

    await wrapper.setProps({ active: true });
    await flushPromises();
    expect(api.get).toHaveBeenCalledWith('/admin/users/1/addons');
  });

  it('renders addon subscriptions in the table', async () => {
    setupApiMocks();
    const wrapper = mountTab(true);
    await flushPromises();

    const table = wrapper.find('[data-testid="user-addons-table"]');
    expect(table.exists()).toBe(true);

    const rows = table.findAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('Extra Storage');
    expect(rows[1].text()).toContain('Priority Support');
  });

  it('displays the payment status badge', async () => {
    setupApiMocks();
    const wrapper = mountTab(true);
    await flushPromises();

    const badges = wrapper.findAll('.status-badge.paid');
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it('renders clickable invoice links', async () => {
    setupApiMocks();
    const wrapper = mountTab(true);
    await flushPromises();

    const invoiceLinks = wrapper.findAll('[data-testid="first-invoice-link"]');
    expect(invoiceLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('shows the empty state when there are no add-ons', async () => {
    setupApiMocks({ addon_subscriptions: [] });
    const wrapper = mountTab(true);
    await flushPromises();

    const empty = wrapper.find('[data-testid="addons-empty-state"]');
    expect(empty.exists()).toBe(true);
    expect(empty.text()).toContain('users.noAddonsForUser');
  });
});
