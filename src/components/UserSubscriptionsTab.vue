<template>
  <div
    data-testid="tab-content-subscriptions"
    class="tab-content"
  >
    <div class="tab-filters">
      <input
        v-model="subscriptionSearch"
        type="text"
        data-testid="subscriptions-search-input"
        :placeholder="$t('subscriptions.searchPlaceholder')"
        class="search-input"
      >
    </div>

    <div
      v-if="subscriptionsLoading"
      class="loading-state"
    >
      <div class="spinner" />
      <p>{{ $t('subscriptions.loading') }}</p>
    </div>

    <div
      v-else-if="filteredSubscriptions.length === 0"
      data-testid="subscriptions-empty-state"
      class="empty-state"
    >
      <p>{{ $t('subscriptions.noSubscriptionsForUser') }}</p>
    </div>

    <table
      v-else
      data-testid="user-subscriptions-table"
      class="data-table"
    >
      <thead>
        <tr>
          <th>{{ $t('subscriptions.plan') }}</th>
          <th>{{ $t('subscriptions.status') }}</th>
          <th>{{ $t('subscriptions.createdAt') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="subscription in filteredSubscriptions"
          :key="subscription.id"
          class="clickable-row"
          @click="navigateToSubscription(subscription.id)"
        >
          <td>{{ subscription.plan_name }}</td>
          <td>
            <span
              class="status-badge"
              :class="subscription.status.toLowerCase()"
            >
              {{ formatStatus(subscription.status) }}
            </span>
          </td>
          <td>{{ formatDate(subscription.created_at) }}</td>
        </tr>
      </tbody>
    </table>

    <div
      v-if="subscriptionsTotalPages > 1"
      data-testid="subscriptions-pagination"
      class="pagination"
    >
      <button
        :disabled="subscriptionsPage === 1"
        class="pagination-btn"
        @click="changeSubscriptionsPage(subscriptionsPage - 1)"
      >
        {{ $t('common.previous') }}
      </button>
      <span class="pagination-info">
        {{ $t('common.page') }} {{ subscriptionsPage }} {{ $t('common.of') }} {{ subscriptionsTotalPages }}
      </span>
      <button
        :disabled="subscriptionsPage >= subscriptionsTotalPages"
        class="pagination-btn"
        @click="changeSubscriptionsPage(subscriptionsPage + 1)"
      >
        {{ $t('common.next') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useSubscriptionsStore, type Subscription } from '../stores/subscriptions';

/**
 * Subscriptions tab on the core User Edit page — contributed by the
 * subscription-admin plugin via `extensionRegistry.userEditTabs`. Core stays
 * agnostic; all subscription state/fetching lives here.
 */
const props = defineProps<{
  /** The user being edited */
  userId: string;
  /** Whether this tab is currently shown — used to lazy-load on first view */
  active: boolean;
}>();

const router = useRouter();
const { t } = useI18n();
const subscriptionsStore = useSubscriptionsStore();

const subscriptionsLoading = ref(false);
const userSubscriptions = ref<Subscription[]>([]);
const subscriptionsTotal = ref(0);
const subscriptionsPage = ref(1);
const subscriptionSearch = ref('');
const subscriptionsPerPage = 10;
const loaded = ref(false);

const subscriptionsTotalPages = computed(() =>
  Math.ceil(subscriptionsTotal.value / subscriptionsPerPage)
);

const filteredSubscriptions = computed(() => {
  if (!subscriptionSearch.value.trim()) {
    return userSubscriptions.value;
  }
  const query = subscriptionSearch.value.toLowerCase();
  return userSubscriptions.value.filter(sub =>
    sub.plan_name?.toLowerCase().includes(query) ||
    sub.status?.toLowerCase().includes(query)
  );
});

async function fetchUserSubscriptions(): Promise<void> {
  subscriptionsLoading.value = true;
  try {
    const response = await subscriptionsStore.fetchSubscriptions({
      page: subscriptionsPage.value,
      per_page: subscriptionsPerPage,
      user_id: props.userId
    });
    userSubscriptions.value = response.subscriptions;
    subscriptionsTotal.value = response.total;
    loaded.value = true;
  } catch {
    // Error handled in store
  } finally {
    subscriptionsLoading.value = false;
  }
}

function changeSubscriptionsPage(page: number): void {
  subscriptionsPage.value = page;
  fetchUserSubscriptions();
}

function navigateToSubscription(subscriptionId: string): void {
  router.push(`/admin/subscriptions/${subscriptionId}`);
}

function formatStatus(status: string): string {
  const statusKey = `subscriptions.statuses.${status}`;
  const translated = t(statusKey);
  return translated === statusKey ? status : translated;
}

function formatDate(dateString?: string | null): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString();
}

// Lazy-load on first activation (mirrors the original switchToSubscriptions guard).
watch(
  () => props.active,
  (isActive) => {
    if (isActive && !loaded.value) {
      fetchUserSubscriptions();
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.tab-content {
  padding: 20px 0;
}

.tab-filters {
  margin-bottom: 20px;
}

.search-input {
  width: 100%;
  max-width: 300px;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.search-input:focus {
  outline: none;
  border-color: #3498db;
}

.loading-state,
.empty-state {
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

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.data-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #2c3e50;
}

.clickable-row {
  cursor: pointer;
  transition: background-color 0.2s;
}

.clickable-row:hover {
  background-color: #f8f9fa;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-badge.active,
.status-badge.paid {
  background: #d4edda;
  color: #155724;
}

.status-badge.cancelled,
.status-badge.failed {
  background: #f8d7da;
  color: #721c24;
}

.status-badge.past_due,
.status-badge.refunded {
  background: #fff3cd;
  color: #856404;
}

.status-badge.trialing,
.status-badge.pending {
  background: #cce5ff;
  color: #004085;
}

.status-badge.paused,
.status-badge.expired {
  background: #e9ecef;
  color: #495057;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.pagination-btn {
  padding: 8px 16px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.pagination-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.pagination-btn:hover:not(:disabled) {
  background: #2980b9;
}

.pagination-info {
  color: #666;
  font-size: 0.9rem;
}
</style>
