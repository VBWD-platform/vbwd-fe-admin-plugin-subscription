<template>
  <div
    v-if="invoice && invoice.subscription_status"
    class="info-section"
    data-testid="subscription-info"
  >
    <h3>{{ $t('invoices.subscriptionInfo') }}</h3>
    <div class="info-grid">
      <div
        v-if="invoice.subscription_status"
        class="info-item"
      >
        <label>{{ $t('common.status') }}</label>
        <span
          class="status-badge"
          :class="invoice.subscription_status"
        >
          {{ invoice.subscription_status }}
        </span>
      </div>
      <div
        v-if="invoice.subscription_start_date"
        class="info-item"
      >
        <label>{{ $t('subscriptions.startDate') }}</label>
        <span>{{ formatDate(invoice.subscription_start_date) }}</span>
      </div>
      <div
        v-if="invoice.subscription_end_date"
        class="info-item"
      >
        <label>{{ $t('subscriptions.endDate') }}</label>
        <span>{{ formatDate(invoice.subscription_end_date) }}</span>
      </div>
      <div class="info-item">
        <label>{{ $t('invoices.trial') }}</label>
        <span>{{ invoice.subscription_is_trial ? $t('common.yes') : $t('common.no') }}</span>
      </div>
      <div
        v-if="invoice.subscription_trial_end"
        class="info-item"
      >
        <label>{{ $t('invoices.trialEndDate') }}</label>
        <span>{{ formatDate(invoice.subscription_trial_end) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * "Subscription Info" block on the core Invoice Details page — contributed by
 * the subscription-admin plugin via `extensionRegistry.invoiceDetailSections`.
 * Core stays subscription-agnostic; it only knows it renders plugin sections
 * with an `:invoice` prop. The subscription_* fields are themselves plugin-
 * contributed on the backend (subscription read model `enrich_invoice`).
 */
interface InvoiceWithSubscription {
  subscription_status?: string;
  subscription_start_date?: string;
  subscription_end_date?: string;
  subscription_is_trial?: boolean;
  subscription_trial_end?: string;
}

defineProps<{
  invoice: InvoiceWithSubscription | null;
}>();

function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString();
}
</script>

<style scoped>
.info-section {
  margin-top: 24px;
}

.info-section h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 1.1rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
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
  text-transform: uppercase;
}

.info-item span {
  font-size: 0.95rem;
  color: #2c3e50;
}

.status-badge {
  text-transform: capitalize;
}
</style>
