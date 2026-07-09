import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAddonStore } from '../../src/stores/addons';
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

describe('addons store — bulkCopyAddons', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('POSTs the selected ids to the bulk copy endpoint in a single request', async () => {
    const store = useAddonStore();

    vi.mocked(api.post).mockResolvedValue({
      addons: [{ id: 'copy-1' }, { id: 'copy-2' }],
      count: 2
    });

    const result = await store.bulkCopyAddons(['1', '2']);

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/admin/addons/bulk/copy', { ids: ['1', '2'] });
    expect(result).toEqual({ addons: [{ id: 'copy-1' }, { id: 'copy-2' }], count: 2 });
  });

  it('records the error and rethrows on failure', async () => {
    const store = useAddonStore();

    vi.mocked(api.post).mockRejectedValue(new Error('boom'));

    await expect(store.bulkCopyAddons(['1'])).rejects.toThrow('boom');
    expect(store.error).toBe('boom');
    expect(store.loading).toBe(false);
  });
});
