import { defineStore } from 'pinia';
import { api } from '@/api';

export interface Subscription {
  id: string;
  user_id?: string;
  user_email: string;
  user_name?: string;
  plan_id?: string;
  plan_name: string;
  status: 'ACTIVE' | 'CANCELLED' | 'PAST_DUE' | 'TRIALING' | 'PAUSED' | 'PENDING' | 'EXPIRED';
  current_period_start?: string;
  current_period_end?: string;
  created_at?: string;
  canceled_at?: string;
  trial_end_at?: string;
  is_trialing?: boolean;
}

export interface SubscriptionDetail extends Subscription {
  payment_history?: PaymentRecord[];
}

export interface PaymentRecord {
  id: string;
  amount: number;
  currency?: string;
  status: string;
  created_at: string;
}

export interface FetchSubscriptionsParams {
  page: number;
  per_page: number;
  status?: string;
  plan?: string;
  user_id?: string;
}

export interface CreateSubscriptionData {
  user_id: string;
  plan_id: string;
  status?: string;
}

export interface FetchSubscriptionsResponse {
  subscriptions: Subscription[];
  total: number;
  page: number;
  per_page: number;
}

export const useSubscriptionsStore = defineStore('subscriptions', {
  state: () => ({
    subscriptions: [] as Subscription[],
    selectedSubscription: null as SubscriptionDetail | null,
    total: 0,
    page: 1,
    perPage: 20,
    loading: false,
    error: null as string | null
  }),

  getters: {
    hasSubscriptions: (state): boolean => state.subscriptions.length > 0,
    totalPages: (state): number => Math.ceil(state.total / state.perPage)
  },

  actions: {
    async fetchSubscriptions(params: FetchSubscriptionsParams): Promise<FetchSubscriptionsResponse> {
      this.loading = true;
      this.error = null;

      try {
        const response = await api.get('/admin/subscriptions', {
          params: {
            page: params.page,
            per_page: params.per_page,
            status: params.status || '',
            plan: params.plan || '',
            user_id: params.user_id || ''
          }
        }) as FetchSubscriptionsResponse;

        this.subscriptions = response.subscriptions;
        this.total = response.total;
        this.page = response.page;
        this.perPage = response.per_page;
        return response;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to fetch subscriptions';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchSubscription(subscriptionId: string): Promise<SubscriptionDetail> {
      this.loading = true;
      this.error = null;

      try {
        const response = await api.get(`/admin/subscriptions/${subscriptionId}`) as { subscription: SubscriptionDetail };
        this.selectedSubscription = response.subscription;
        return response.subscription;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to fetch subscription';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async cancelSubscription(subscriptionId: string, reason: string): Promise<void> {
      this.loading = true;
      this.error = null;

      try {
        await api.post(`/admin/subscriptions/${subscriptionId}/cancel`, { reason });

        // Update local state
        if (this.selectedSubscription?.id === subscriptionId) {
          this.selectedSubscription.status = 'CANCELLED';
        }
        const index = this.subscriptions.findIndex(s => s.id === subscriptionId);
        if (index !== -1) {
          this.subscriptions[index].status = 'CANCELLED';
        }
      } catch (error) {
        this.error = (error as Error).message || 'Failed to cancel subscription';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async refundSubscription(subscriptionId: string, amount: number, reason: string): Promise<void> {
      this.loading = true;
      this.error = null;

      try {
        await api.post(`/admin/subscriptions/${subscriptionId}/refund`, { amount, reason });
      } catch (error) {
        this.error = (error as Error).message || 'Failed to process refund';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async extendSubscription(subscriptionId: string, days: number): Promise<void> {
      this.loading = true;
      this.error = null;

      try {
        await api.post(`/admin/subscriptions/${subscriptionId}/extend`, { days });
      } catch (error) {
        this.error = (error as Error).message || 'Failed to extend subscription';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async changePlan(subscriptionId: string, planId: string): Promise<void> {
      this.loading = true;
      this.error = null;

      try {
        await api.put(`/admin/subscriptions/${subscriptionId}/plan`, { plan_id: planId });
      } catch (error) {
        this.error = (error as Error).message || 'Failed to change plan';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createSubscription(data: CreateSubscriptionData): Promise<Subscription> {
      this.loading = true;
      this.error = null;

      try {
        const response = await api.post('/admin/subscriptions', data) as { subscription: Subscription };
        // Add to local list
        this.subscriptions.unshift(response.subscription);
        this.total += 1;
        return response.subscription;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to create subscription';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    clearSelectedSubscription(): void {
      this.selectedSubscription = null;
    },

    reset(): void {
      this.subscriptions = [];
      this.selectedSubscription = null;
      this.total = 0;
      this.page = 1;
      this.error = null;
      this.loading = false;
    }
  }
});
