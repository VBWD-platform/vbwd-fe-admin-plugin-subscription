import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { usePlanAdminStore } from '../../src/stores/planAdmin';
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

describe('planAdmin store — bulkCopyPlans', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('POSTs the selected ids to the bulk copy endpoint in a single request', async () => {
    const store = usePlanAdminStore();

    vi.mocked(api.post).mockResolvedValue({
      plans: [{ id: 'copy-1' }, { id: 'copy-2' }],
      count: 2
    });

    const result = await store.bulkCopyPlans(['1', '2']);

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/admin/tarif-plans/bulk/copy', { ids: ['1', '2'] });
    expect(result).toEqual({ plans: [{ id: 'copy-1' }, { id: 'copy-2' }], count: 2 });
  });

  it('records the error and rethrows on failure', async () => {
    const store = usePlanAdminStore();

    vi.mocked(api.post).mockRejectedValue(new Error('boom'));

    await expect(store.bulkCopyPlans(['1'])).rejects.toThrow('boom');
    expect(store.error).toBe('boom');
    expect(store.loading).toBe(false);
  });

  it('keeps the single-item copyPlan action for other callers', async () => {
    const store = usePlanAdminStore();

    vi.mocked(api.post).mockResolvedValue({ plan: { id: 'copy-1' } });

    await store.copyPlan('1');

    expect(api.post).toHaveBeenCalledWith('/admin/tarif-plans/1/copy');
  });
});
