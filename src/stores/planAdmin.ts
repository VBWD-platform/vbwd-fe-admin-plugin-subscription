import { defineStore } from 'pinia';
import { api } from '@/api';

export interface AdminPlanPrice {
  price_decimal: string;
  price_float: number;
  currency_code?: string;
  currency_symbol?: string;
}

export interface AdminPlanCategory {
  id: string;
  name: string;
  slug: string;
  is_single: boolean;
}

export interface AdminPlan {
  id: string;
  name: string;
  price?: AdminPlanPrice | number;
  price_float?: number;
  currency?: string;
  billing_period: 'MONTHLY' | 'YEARLY' | 'QUARTERLY' | 'WEEKLY' | 'ONE_TIME';
  features?: string[] | Record<string, unknown>;
  limits?: Record<string, number>;
  is_active: boolean;
  subscriber_count?: number;
  created_at?: string;
  trial_days?: number;
  categories?: AdminPlanCategory[];
}

export interface CreatePlanData {
  name: string;
  price: number;
  billing_period: string;
  features?: string[] | Record<string, unknown>;
  limits?: Record<string, number>;
  trial_days?: number;
}

export const usePlanAdminStore = defineStore('planAdmin', {
  state: () => ({
    plans: [] as AdminPlan[],
    selectedPlan: null as AdminPlan | null,
    loading: false,
    error: null as string | null
  }),

  actions: {
    async fetchPlans(includeArchived = false) {
      this.loading = true;
      this.error = null;

      try {
        const response = await api.get('/admin/tarif-plans', {
          params: { include_archived: includeArchived }
        }) as { plans: AdminPlan[] };

        this.plans = response.plans;
        return response.plans;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to fetch plans';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchPlan(planId: string): Promise<AdminPlan> {
      this.loading = true;
      this.error = null;

      try {
        const response = await api.get(`/admin/tarif-plans/${planId}`) as { plan: AdminPlan };
        this.selectedPlan = response.plan;
        return response.plan;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to fetch plan';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createPlan(data: CreatePlanData) {
      this.loading = true;
      this.error = null;

      try {
        const response = await api.post('/admin/tarif-plans', data);
        return response as { plan_id: string };
      } catch (error) {
        this.error = (error as Error).message || 'Failed to create plan';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updatePlan(planId: string, data: Partial<AdminPlan>) {
      this.loading = true;
      this.error = null;

      try {
        const response = await api.put(`/admin/tarif-plans/${planId}`, data);
        return response;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to update plan';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async archivePlan(planId: string) {
      this.loading = true;
      this.error = null;

      try {
        const response = await api.post(`/admin/tarif-plans/${planId}/archive`);
        return response;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to archive plan';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async activatePlan(planId: string) {
      this.loading = true;
      this.error = null;

      try {
        const response = await api.post(`/admin/tarif-plans/${planId}/activate`);
        return response;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to activate plan';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async copyPlan(planId: string): Promise<AdminPlan> {
      this.loading = true;
      this.error = null;

      try {
        const response = await api.post(`/admin/tarif-plans/${planId}/copy`) as { plan: AdminPlan };
        return response.plan;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to copy plan';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async bulkCopyPlans(ids: string[]): Promise<{ plans: AdminPlan[]; count: number }> {
      this.loading = true;
      this.error = null;

      try {
        const response = await api.post('/admin/tarif-plans/bulk/copy', { ids });
        return response as { plans: AdminPlan[]; count: number };
      } catch (error) {
        this.error = (error as Error).message || 'Failed to copy plans';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async getSubscriberCount(planId: string): Promise<number> {
      try {
        const response = await api.get(`/admin/tarif-plans/${planId}/subscribers/count`) as { count: number };
        return response.count;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to get subscriber count';
        throw error;
      }
    },

    async deletePlan(planId: string): Promise<void> {
      this.error = null;

      try {
        await api.delete(`/admin/tarif-plans/${planId}`);

        // Update local state
        const index = this.plans.findIndex(p => p.id === planId);
        if (index !== -1) {
          this.plans.splice(index, 1);
        }

        if (this.selectedPlan?.id === planId) {
          this.selectedPlan = null;
        }
      } catch (error) {
        // Extract error message from API response if available
        let errorMessage = 'Failed to delete plan';
        if (error instanceof Error) {
          // Try to extract error from API response
          const apiError = (error as any).response?.data?.error;
          if (apiError) {
            errorMessage = apiError;
          } else {
            errorMessage = error.message;
          }
        }
        this.error = errorMessage;
        throw new Error(errorMessage);
      }
    },

    reset() {
      this.plans = [];
      this.selectedPlan = null;
      this.error = null;
      this.loading = false;
    }
  }
});
