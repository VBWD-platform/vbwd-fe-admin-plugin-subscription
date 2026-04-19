import { defineStore } from 'pinia';
import { api } from '@/api';

export interface AdminAddon {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  currency: string;
  billing_period: string;
  config: Record<string, unknown>;
  is_active: boolean;
  sort_order: number;
  tarif_plan_ids: string[];
  tarif_plans?: { id: string; name: string }[];
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateAddonData {
  name: string;
  slug?: string;
  description?: string;
  price: number;
  currency?: string;
  billing_period: string;
  config?: Record<string, unknown>;
  is_active?: boolean;
  sort_order?: number;
  tarif_plan_ids?: string[];
}

export const useAddonStore = defineStore('addons', {
  state: () => ({
    addons: [] as AdminAddon[],
    selectedAddon: null as AdminAddon | null,
    total: 0,
    loading: false,
    error: null as string | null
  }),

  actions: {
    async fetchAddons(page = 1, perPage = 20, includeInactive = true) {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.get('/admin/addons/', {
          params: { page, per_page: perPage, include_inactive: includeInactive }
        }) as { items: AdminAddon[]; total: number };
        this.addons = response.items || [];
        this.total = response.total || 0;
        return response;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to fetch add-ons';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchAddon(addonId: string): Promise<AdminAddon> {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.get(`/admin/addons/${addonId}`) as { addon: AdminAddon };
        this.selectedAddon = response.addon;
        return response.addon;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to fetch add-on';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createAddon(data: CreateAddonData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.post('/admin/addons/', data);
        return response;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to create add-on';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateAddon(addonId: string, data: Partial<CreateAddonData>) {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.put(`/admin/addons/${addonId}`, data);
        return response;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to update add-on';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deleteAddon(addonId: string) {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.delete(`/admin/addons/${addonId}`);
        return response;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to delete add-on';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async activateAddon(addonId: string) {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.post(`/admin/addons/${addonId}/activate`);
        return response;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to activate add-on';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deactivateAddon(addonId: string) {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.post(`/admin/addons/${addonId}/deactivate`);
        return response;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to deactivate add-on';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    reset() {
      this.addons = [];
      this.selectedAddon = null;
      this.total = 0;
      this.error = null;
      this.loading = false;
    }
  }
});
