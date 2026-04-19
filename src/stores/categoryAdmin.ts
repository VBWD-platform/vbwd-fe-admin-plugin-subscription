import { defineStore } from 'pinia';
import { api } from '@/api';

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  is_single: boolean;
  sort_order: number;
  plan_count: number;
  children: AdminCategory[];
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateCategoryData {
  name: string;
  slug?: string;
  description?: string;
  parent_id?: string | null;
  is_single?: boolean;
  sort_order?: number;
}

export const useCategoryAdminStore = defineStore('categoryAdmin', {
  state: () => ({
    categories: [] as AdminCategory[],
    selectedCategory: null as AdminCategory | null,
    loading: false,
    error: null as string | null
  }),

  actions: {
    async fetchCategories(format: 'flat' | 'tree' = 'flat') {
      this.loading = true;
      this.error = null;

      try {
        const response = await api.get('/admin/tarif-plan-categories', {
          params: { format }
        }) as { categories: AdminCategory[] };

        this.categories = response.categories;
        return response.categories;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to fetch categories';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchCategory(categoryId: string): Promise<AdminCategory> {
      this.loading = true;
      this.error = null;

      try {
        const response = await api.get(`/admin/tarif-plan-categories/${categoryId}`) as { category: AdminCategory };
        this.selectedCategory = response.category;
        return response.category;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to fetch category';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createCategory(data: CreateCategoryData) {
      this.loading = true;
      this.error = null;

      try {
        const response = await api.post('/admin/tarif-plan-categories', data);
        return response as { category: AdminCategory };
      } catch (error) {
        this.error = (error as Error).message || 'Failed to create category';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateCategory(categoryId: string, data: Partial<CreateCategoryData>) {
      this.loading = true;
      this.error = null;

      try {
        const response = await api.put(`/admin/tarif-plan-categories/${categoryId}`, data);
        return response;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to update category';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deleteCategory(categoryId: string): Promise<void> {
      this.error = null;

      try {
        await api.delete(`/admin/tarif-plan-categories/${categoryId}`);

        const index = this.categories.findIndex(c => c.id === categoryId);
        if (index !== -1) {
          this.categories.splice(index, 1);
        }

        if (this.selectedCategory?.id === categoryId) {
          this.selectedCategory = null;
        }
      } catch (error) {
        let errorMessage = 'Failed to delete category';
        if (error instanceof Error) {
          const apiError = (error as any).response?.data?.error;
          errorMessage = apiError || error.message;
        }
        this.error = errorMessage;
        throw new Error(errorMessage);
      }
    },

    async attachPlans(categoryId: string, planIds: string[]) {
      this.loading = true;
      this.error = null;

      try {
        const response = await api.post(`/admin/tarif-plan-categories/${categoryId}/attach-plans`, {
          plan_ids: planIds
        }) as { category: AdminCategory };
        this.selectedCategory = response.category;
        return response.category;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to attach plans';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async detachPlans(categoryId: string, planIds: string[]) {
      this.loading = true;
      this.error = null;

      try {
        const response = await api.post(`/admin/tarif-plan-categories/${categoryId}/detach-plans`, {
          plan_ids: planIds
        }) as { category: AdminCategory };
        this.selectedCategory = response.category;
        return response.category;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to detach plans';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    reset() {
      this.categories = [];
      this.selectedCategory = null;
      this.error = null;
      this.loading = false;
    }
  }
});
