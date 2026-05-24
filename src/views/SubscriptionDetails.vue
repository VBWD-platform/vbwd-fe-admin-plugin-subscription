<template>
  <div
    class="subscription-details-view"
    data-testid="subscription-details-view"
  >
    <div
      v-if="loading"
      data-testid="loading-spinner"
      class="loading-state"
    >
      <div class="spinner" />
      <p>{{ $t('subscriptions.loading') }}</p>
    </div>

    <div
      v-else-if="error"
      data-testid="error-message"
      class="error-state"
    >
      <p>{{ error }}</p>
      <button
        class="back-btn"
        @click="goBack"
      >
        {{ $t('subscriptions.backToSubscriptions') }}
      </button>
    </div>

    <template v-else-if="subscription">
      <div class="details-header">
        <button
          data-testid="back-button"
          class="back-btn"
          @click="goBack"
        >
          &larr; {{ $t('subscriptions.backToSubscriptions') }}
        </button>
        <h2>{{ $t('subscriptions.subscriptionDetails') }}</h2>
      </div>

      <div class="details-content">
        <div class="info-section">
          <h3>{{ $t('subscriptions.userInformation') }}</h3>
          <div class="info-grid">
            <div class="info-item">
              <label>{{ $t('users.email') }}</label>
              <span>{{ subscription.user_email }}</span>
            </div>
            <div class="info-item">
              <label>{{ $t('users.name') }}</label>
              <span>{{ subscription.user_name }}</span>
            </div>
          </div>
        </div>

        <div class="info-section">
          <h3>{{ $t('subscriptions.subscriptionInformation') }}</h3>
          <div class="info-grid">
            <div class="info-item">
              <label>{{ $t('subscriptions.plan') }}</label>
              <span>{{ subscription.plan_name }}</span>
            </div>
            <div class="info-item">
              <label>{{ $t('subscriptions.status') }}</label>
              <span
                :data-testid="`status-${subscription.status.toLowerCase()}`"
                class="status-badge"
                :class="subscription.status.toLowerCase()"
              >
                {{ formatStatus(subscription.status) }}
              </span>
            </div>
          </div>
        </div>

        <div
          v-if="subscription.is_trialing || subscription.trial_end_at"
          class="info-section"
          data-testid="trial-info"
        >
          <h3>{{ $t('subscriptions.trialInfo') }}</h3>
          <div class="info-grid">
            <div class="info-item">
              <label>{{ $t('subscriptions.trialEndDate') }}</label>
              <span>{{ formatDate(subscription.trial_end_at) }}</span>
            </div>
            <div class="info-item">
              <label>{{ $t('subscriptions.daysRemaining') }}</label>
              <span>{{ trialDaysRemaining }}</span>
            </div>
          </div>
        </div>

        <div
          class="info-section"
          data-testid="billing-period"
        >
          <h3>{{ $t('subscriptions.billingPeriod') }}</h3>
          <div class="info-grid">
            <div class="info-item">
              <label>{{ $t('subscriptions.currentPeriodStart') }}</label>
              <span>{{ formatDate(subscription.current_period_start) }}</span>
            </div>
            <div class="info-item">
              <label>{{ $t('subscriptions.currentPeriodEnd') }}</label>
              <span>{{ formatDate(subscription.current_period_end) }}</span>
            </div>
            <div class="info-item">
              <label>{{ $t('subscriptions.createdAt') }}</label>
              <span>{{ formatDate(subscription.created_at) }}</span>
            </div>
          </div>
        </div>

        <div
          class="info-section"
          data-testid="payment-history"
        >
          <h3>{{ $t('subscriptions.paymentHistory') }}</h3>
          <table
            v-if="subscription.payment_history?.length"
            class="payments-table"
          >
            <thead>
              <tr>
                <th>{{ $t('invoices.date') }}</th>
                <th>{{ $t('invoices.amount') }}</th>
                <th>{{ $t('invoices.status') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="payment in subscription.payment_history"
                :key="payment.id"
                class="clickable-row"
                @click="goToInvoice(payment.id)"
              >
                <td>{{ formatDate(payment.created_at) }}</td>
                <td>{{ formatAmount(payment.amount, payment.currency) }}</td>
                <td>
                  <span
                    class="payment-status"
                    :class="payment.status.toLowerCase()"
                  >
                    {{ payment.status }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <p
            v-else
            class="no-payments"
          >
            {{ $t('subscriptions.noPaymentHistory') }}
          </p>
        </div>

        <div
          v-if="canManage && subscription.status === 'ACTIVE'"
          class="actions-section"
        >
          <button
            data-testid="cancel-button"
            class="cancel-btn"
            :disabled="canceling"
            @click="handleCancel"
          >
            {{ canceling ? $t('subscriptions.canceling') : $t('subscriptions.cancelSubscription') }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import { useSubscriptionsStore } from '../stores/subscriptions';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const authStore = useAuthStore();
const subscriptionsStore = useSubscriptionsStore();

const canManage = computed(() => authStore.hasPermission('subscription.subscriptions.manage'));

const canceling = ref(false);

const subscription = computed(() => subscriptionsStore.selectedSubscription);
const loading = computed(() => subscriptionsStore.loading);
const error = computed(() => subscriptionsStore.error);

const trialDaysRemaining = computed(() => {
  if (!subscription.value?.trial_end_at) return 0;
  const diff = new Date(subscription.value.trial_end_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
});

async function fetchSubscription(): Promise<void> {
  const subscriptionId = route.params.id as string;
  try {
    await subscriptionsStore.fetchSubscription(subscriptionId);
  } catch {
    // Error is already set in the store
  }
}

async function handleCancel(): Promise<void> {
  if (!subscription.value) return;

  canceling.value = true;
  try {
    await subscriptionsStore.cancelSubscription(subscription.value.id, 'Admin cancellation');
    await fetchSubscription();
  } catch {
    // Error is already set in the store
  } finally {
    canceling.value = false;
  }
}

function goBack(): void {
  router.push('/admin/subscriptions');
}

function goToInvoice(invoiceId: string): void {
  router.push(`/admin/invoices/${invoiceId}`);
}

function formatStatus(status: string): string {
  const statusKey = `subscriptions.statuses.${status}`;
  const translated = t(statusKey);
  // If translation key not found, return original status
  return translated === statusKey ? status : translated;
}

function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString();
}

function formatAmount(amount: number, currency?: string): string {
  const currencyCode = currency || 'USD';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode
  }).format(amount);
}

onMounted(() => {
  fetchSubscription();
});
</script>

<style scoped>
.subscription-details-view {
  background: white;
  padding: 20px;
  border-radius: 8px;
}

.loading-state,
.error-state {
  text-align: center;
  padding: 40px;
  color: #666;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.details-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
}

.details-header h2 {
  margin: 0;
  color: #2c3e50;
}

.back-btn {
  padding: 8px 16px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.back-btn:hover {
  background: #5a6268;
}

.details-content {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.info-section {
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 20px;
}

.info-section h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 1rem;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.info-item label {
  font-size: 0.8rem;
  color: #666;
  font-weight: 500;
}

.info-item span {
  font-size: 1rem;
  color: #2c3e50;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
  width: fit-content;
}

.status-badge.active {
  background: #d4edda;
  color: #155724;
}

.status-badge.canceled {
  background: #f8d7da;
  color: #721c24;
}

.status-badge.past_due {
  background: #fff3cd;
  color: #856404;
}

.status-badge.trialing {
  background: #cce5ff;
  color: #004085;
}

.status-badge.paused {
  background: #e9ecef;
  color: #495057;
}

.payments-table {
  width: 100%;
  border-collapse: collapse;
}

.payments-table th,
.payments-table td {
  padding: 10px 15px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.payments-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #2c3e50;
}

.clickable-row {
  cursor: pointer;
  transition: background-color 0.2s;
}

.clickable-row:hover {
  background-color: #f0f7ff;
}

.payment-status {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 500;
}

.payment-status.succeeded {
  background: #d4edda;
  color: #155724;
}

.payment-status.failed {
  background: #f8d7da;
  color: #721c24;
}

.payment-status.pending {
  background: #fff3cd;
  color: #856404;
}

.no-payments {
  color: #666;
  font-style: italic;
}

.actions-section {
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.cancel-btn {
  padding: 10px 20px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.cancel-btn:hover:not(:disabled) {
  background: #c82333;
}

.cancel-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>
