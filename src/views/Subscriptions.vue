<template>
  <div
    class="subscriptions-view"
    data-testid="subscriptions-view"
  >
    <div class="subscriptions-header">
      <div class="header-left">
        <h2>{{ $t('subscriptions.title') }}</h2>
        <span
          v-if="!loading && !error"
          class="total-count"
        >{{ total }} {{ $t('common.entries') }}</span>
      </div>
      <button
        data-testid="create-subscription-button"
        class="create-btn"
        @click="navigateToCreate"
      >
        {{ $t('subscriptions.createSubscription') }}
      </button>
    </div>

    <div class="subscriptions-filters">
      <input
        v-model="searchQuery"
        type="text"
        data-testid="search-input"
        :placeholder="$t('common.search')"
        class="search-input"
        @input="handleSearch"
      >
      <select
        v-model="statusFilter"
        data-testid="status-filter"
        class="filter-select"
        @change="handleFilterChange"
      >
        <option value="">
          {{ $t('common.all') }} {{ $t('common.status') }}
        </option>
        <option value="ACTIVE">
          {{ $t('subscriptions.statuses.active') }}
        </option>
        <option value="CANCELLED">
          {{ $t('subscriptions.statuses.cancelled') }}
        </option>
        <option value="PAST_DUE">
          {{ $t('subscriptions.statuses.pastDue') }}
        </option>
        <option value="TRIALING">
          {{ $t('subscriptions.statuses.trialing') }}
        </option>
        <option value="PAUSED">
          {{ $t('subscriptions.statuses.paused') }}
        </option>
      </select>
      <select
        v-model="planFilter"
        data-testid="plan-filter"
        class="filter-select"
        @change="handleFilterChange"
      >
        <option value="">
          {{ $t('common.all') }} {{ $t('nav.plans') }}
        </option>
        <option value="Free">
          Free
        </option>
        <option value="Pro">
          Pro
        </option>
        <option value="Enterprise">
          Enterprise
        </option>
      </select>
    </div>

    <div
      v-if="loading"
      data-testid="loading-spinner"
      class="loading-state"
    >
      <div class="spinner" />
      <p>{{ $t('common.loading') }}</p>
    </div>

    <div
      v-else-if="error"
      data-testid="error-message"
      class="error-state"
    >
      <p>{{ error }}</p>
      <button
        class="retry-btn"
        @click="fetchSubscriptions"
      >
        {{ $t('common.retry') }}
      </button>
    </div>

    <div
      v-else-if="subscriptions.length === 0"
      data-testid="empty-state"
      class="empty-state"
    >
      <p>{{ $t('subscriptions.noSubscriptions') }}</p>
    </div>

    <table
      v-else
      data-testid="subscriptions-table"
      class="subscriptions-table"
    >
      <thead>
        <tr>
          <th
            class="sortable"
            :class="{ sorted: sortColumn === 'user_email', 'sort-asc': sortColumn === 'user_email' && sortDirection === 'asc', 'sort-desc': sortColumn === 'user_email' && sortDirection === 'desc' }"
            data-sortable="user_email"
            @click="handleSort('user_email')"
          >
            {{ $t('subscriptions.user') }}
            <span class="sort-indicator">{{ getSortIndicator('user_email') }}</span>
          </th>
          <th
            class="sortable"
            :class="{ sorted: sortColumn === 'plan_name', 'sort-asc': sortColumn === 'plan_name' && sortDirection === 'asc', 'sort-desc': sortColumn === 'plan_name' && sortDirection === 'desc' }"
            data-sortable="plan_name"
            @click="handleSort('plan_name')"
          >
            {{ $t('subscriptions.plan') }}
            <span class="sort-indicator">{{ getSortIndicator('plan_name') }}</span>
          </th>
          <th
            class="sortable"
            :class="{ sorted: sortColumn === 'status', 'sort-asc': sortColumn === 'status' && sortDirection === 'asc', 'sort-desc': sortColumn === 'status' && sortDirection === 'desc' }"
            data-sortable="status"
            @click="handleSort('status')"
          >
            {{ $t('subscriptions.status') }}
            <span class="sort-indicator">{{ getSortIndicator('status') }}</span>
          </th>
          <th
            class="sortable"
            :class="{ sorted: sortColumn === 'created_at', 'sort-asc': sortColumn === 'created_at' && sortDirection === 'asc', 'sort-desc': sortColumn === 'created_at' && sortDirection === 'desc' }"
            data-sortable="created_at"
            @click="handleSort('created_at')"
          >
            {{ $t('subscriptions.createdAt') }}
            <span class="sort-indicator">{{ getSortIndicator('created_at') }}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="subscription in sortedSubscriptions"
          :key="subscription.id"
          :data-testid="`subscription-row-${subscription.id}`"
          class="subscription-row"
          @click="navigateToSubscription(subscription.id)"
        >
          <td>{{ subscription.user_email }}</td>
          <td>{{ subscription.plan_name }}</td>
          <td>
            <span
              :data-testid="`status-${subscription.status.toLowerCase()}`"
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
      v-if="totalPages > 1"
      data-testid="pagination"
      class="pagination"
    >
      <button
        data-testid="pagination-prev"
        :disabled="page === 1"
        class="pagination-btn"
        @click="changePage(page - 1)"
      >
        {{ $t('common.previous') }}
      </button>
      <span class="pagination-info">{{ $t('common.page') }} {{ page }} {{ $t('common.of') }} {{ totalPages }}</span>
      <button
        data-testid="pagination-next"
        :disabled="page >= totalPages"
        class="pagination-btn"
        @click="changePage(page + 1)"
      >
        {{ $t('common.next') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useSubscriptionsStore } from '@/stores/subscriptions';

const { t } = useI18n();

const router = useRouter();
const subscriptionsStore = useSubscriptionsStore();

const statusFilter = ref('');
const planFilter = ref('');
const searchQuery = ref('');
const page = ref(1);
const perPage = ref(20);

// Sorting state
type SortColumn = 'user_email' | 'plan_name' | 'status' | 'created_at' | null;
type SortDirection = 'asc' | 'desc';
const sortColumn = ref<SortColumn>(null);
const sortDirection = ref<SortDirection>('asc');

const subscriptions = computed(() => subscriptionsStore.subscriptions);

// Filtered and sorted subscriptions for display
const sortedSubscriptions = computed(() => {
  // First filter by search query
  let filtered = subscriptions.value;
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filtered = subscriptions.value.filter(sub =>
      sub.user_email?.toLowerCase().includes(query)
    );
  }

  if (!sortColumn.value) return filtered;

  return [...filtered].sort((a, b) => {
    const column = sortColumn.value as SortColumn;
    if (!column) return 0;

    let aVal = a[column];
    let bVal = b[column];

    // Handle null/undefined
    if (aVal == null) aVal = '';
    if (bVal == null) bVal = '';

    // String comparison
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      const comparison = aVal.localeCompare(bVal);
      return sortDirection.value === 'asc' ? comparison : -comparison;
    }

    // Fallback for other types
    if (aVal < bVal) return sortDirection.value === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection.value === 'asc' ? 1 : -1;
    return 0;
  });
});
const total = computed(() => subscriptionsStore.total);
const loading = computed(() => subscriptionsStore.loading);
const error = computed(() => subscriptionsStore.error);
const totalPages = computed(() => Math.ceil(total.value / perPage.value));

async function fetchSubscriptions(): Promise<void> {
  try {
    await subscriptionsStore.fetchSubscriptions({
      page: page.value,
      per_page: perPage.value,
      status: statusFilter.value,
      plan: planFilter.value
    });
  } catch {
    // Error is already set in the store
  }
}

function handleSearch(): void {
  // Client-side filtering is handled by the computed property
  // This function is here for consistency and future server-side search
}

function handleFilterChange(): void {
  page.value = 1;
  fetchSubscriptions();
}

function changePage(newPage: number): void {
  page.value = newPage;
  fetchSubscriptions();
}

function navigateToSubscription(subscriptionId: string): void {
  router.push(`/admin/subscriptions/${subscriptionId}`);
}

function navigateToCreate(): void {
  router.push('/admin/subscriptions/create');
}

function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    active: t('subscriptions.statuses.active'),
    cancelled: t('subscriptions.statuses.cancelled'),
    past_due: t('subscriptions.statuses.pastDue'),
    trialing: t('subscriptions.statuses.trialing'),
    paused: t('subscriptions.statuses.paused'),
    pending: t('subscriptions.statuses.pending'),
    expired: t('subscriptions.statuses.expired')
  };
  return statusMap[status] || status;
}

function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString();
}

function handleSort(column: SortColumn): void {
  if (sortColumn.value === column) {
    // Toggle direction
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    // New column
    sortColumn.value = column;
    sortDirection.value = 'asc';
  }
}

function getSortIndicator(column: SortColumn): string {
  if (sortColumn.value !== column) return '';
  return sortDirection.value === 'asc' ? '▲' : '▼';
}

onMounted(() => {
  fetchSubscriptions();
});
</script>

<style scoped>
.subscriptions-view {
  background: white;
  padding: 20px;
  border-radius: 8px;
}

.subscriptions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.subscriptions-header h2 {
  margin: 0;
  color: #2c3e50;
}

.total-count {
  color: #666;
  font-size: 0.9rem;
}

.create-btn {
  padding: 10px 20px;
  background: #27ae60;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.create-btn:hover {
  background: #1e8449;
}

.subscriptions-filters {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
}

.search-input {
  flex: 1;
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

.filter-select {
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  min-width: 150px;
}

.loading-state,
.error-state,
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

.retry-btn {
  margin-top: 15px;
  padding: 10px 20px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.retry-btn:hover {
  background: #2980b9;
}

.subscriptions-table {
  width: 100%;
  border-collapse: collapse;
}

.subscriptions-table th,
.subscriptions-table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.subscriptions-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #2c3e50;
}

.subscription-row {
  cursor: pointer;
  transition: background-color 0.2s;
}

.subscription-row:hover {
  background-color: #f8f9fa;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-badge.active {
  background: #d4edda;
  color: #155724;
}

.status-badge.cancelled {
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

/* Sortable columns */
.sortable {
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
}

.sortable:hover {
  background-color: #e9ecef;
}

.sortable.sorted {
  background-color: #e3f2fd;
}

.sort-indicator {
  margin-left: 5px;
  font-size: 0.8em;
  color: #3498db;
}
</style>
