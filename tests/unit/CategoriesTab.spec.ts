import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import CategoriesTab from '../../src/components/CategoriesTab.vue';
import { api } from '@/api';

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

describe('CategoriesTab.vue', () => {
  let router: ReturnType<typeof createRouter>;

  const mockCategories = [
    { id: 'root-id', name: 'Root', slug: 'root', parent_id: null, is_single: true, plan_count: 0, children: [] },
    { id: 'cat-a', name: 'Alpha', slug: 'alpha', parent_id: null, is_single: true, plan_count: 2, children: [] },
    { id: 'cat-b', name: 'Beta', slug: 'beta', parent_id: null, is_single: false, plan_count: 1, children: [] },
    { id: 'cat-c', name: 'Gamma', slug: 'gamma', parent_id: 'cat-a', is_single: true, plan_count: 0, children: [] }
  ];

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/admin/plans', name: 'plans', component: { template: '<div/>' } },
        { path: '/admin/plans/categories/new', name: 'cat-new', component: { template: '<div/>' } },
        { path: '/admin/plans/categories/:id/edit', name: 'cat-edit', component: { template: '<div/>' } }
      ]
    });

    vi.mocked(api.get).mockResolvedValue({ categories: mockCategories });
    vi.mocked(api.put).mockResolvedValue({ category: {} });
  });

  function mountTab() {
    return mount(CategoriesTab, {
      props: { active: true },
      global: { plugins: [router] }
    });
  }

  it('renders the categories table when active', async () => {
    const wrapper = mountTab();
    await flushPromises();
    expect(wrapper.find('[data-testid="categories-table"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Alpha');
    expect(wrapper.text()).toContain('Beta');
  });

  it('shows bulk parent assign/unassign controls when a category is selected', async () => {
    const wrapper = mountTab();
    await flushPromises();

    expect(wrapper.find('[data-testid="bulk-assign-parent"]').exists()).toBe(false);

    await wrapper.find('[data-testid="category-row-cat-a"] input[type="checkbox"]').setValue(true);
    await flushPromises();

    expect(wrapper.find('[data-testid="bulk-assign-parent-select"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="bulk-assign-parent-btn"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="bulk-unassign-parent-btn"]').exists()).toBe(true);
  });

  it('excludes selected categories from the parent options', async () => {
    const wrapper = mountTab();
    await flushPromises();

    await wrapper.find('[data-testid="category-row-cat-a"] input[type="checkbox"]').setValue(true);
    await flushPromises();

    const options = wrapper.findAll('[data-testid="bulk-assign-parent-select"] option').map(o => o.text());
    // cat-a is selected, so "Alpha" must not be a parent candidate.
    expect(options).not.toContain('Alpha');
    expect(options).toContain('Beta');
    expect(options).toContain('Root');
  });

  it('bulk-assigns a parent to selected categories via PUT', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const wrapper = mountTab();
    await flushPromises();

    await wrapper.find('[data-testid="category-row-cat-b"] input[type="checkbox"]').setValue(true);
    await wrapper.find('[data-testid="category-row-cat-c"] input[type="checkbox"]').setValue(true);
    await flushPromises();

    await wrapper.find('[data-testid="bulk-assign-parent-select"]').setValue('cat-a');
    await wrapper.find('[data-testid="bulk-assign-parent-btn"]').trigger('click');
    await flushPromises();

    expect(api.put).toHaveBeenCalledWith('/admin/tarif-plan-categories/cat-b', { parent_id: 'cat-a' });
    expect(api.put).toHaveBeenCalledWith('/admin/tarif-plan-categories/cat-c', { parent_id: 'cat-a' });
    expect(wrapper.find('[data-testid="bulk-success-message"]').exists()).toBe(true);

    confirmSpy.mockRestore();
  });

  it('bulk-unassigns the parent (sets parent_id null) for selected categories', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const wrapper = mountTab();
    await flushPromises();

    await wrapper.find('[data-testid="category-row-cat-c"] input[type="checkbox"]').setValue(true);
    await flushPromises();

    await wrapper.find('[data-testid="bulk-unassign-parent-btn"]').trigger('click');
    await flushPromises();

    expect(api.put).toHaveBeenCalledWith('/admin/tarif-plan-categories/cat-c', { parent_id: null });
    expect(wrapper.find('[data-testid="bulk-success-message"]').exists()).toBe(true);

    confirmSpy.mockRestore();
  });

  it('cannot select the root category', async () => {
    const wrapper = mountTab();
    await flushPromises();
    const rootCheckbox = wrapper.find('[data-testid="category-row-root-id"] input[type="checkbox"]');
    expect(rootCheckbox.attributes('disabled')).toBeDefined();
  });
});
