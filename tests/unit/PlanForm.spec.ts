import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import PlanForm from '../../src/views/PlanForm.vue';
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
});
