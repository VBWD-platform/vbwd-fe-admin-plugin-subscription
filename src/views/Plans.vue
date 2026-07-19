<template>
  <div
    class="plans-view"
    data-testid="plans-view"
  >
    <div class="plans-header">
      <h2>{{ $t('plans.title') }}</h2>
    </div>

    <!-- Tabs -->
    <div
      class="tabs"
      data-testid="plans-tabs"
    >
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'plans' }"
        data-testid="tab-plans"
        @click="activeTab = 'plans'"
      >
        {{ $t('plans.plansTab') }}
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'categories' }"
        data-testid="tab-categories"
        @click="activeTab = 'categories'"
      >
        {{ $t('categories.categoriesTab') }}
      </button>
    </div>

    <!-- Categories Tab -->
    <CategoriesTab
      v-if="activeTab === 'categories'"
      :active="activeTab === 'categories'"
    />

    <!-- Plans Tab -->
    <template v-if="activeTab === 'plans'">
      <div class="plans-subheader">
        <button
          v-if="canManage"
          data-testid="create-plan-button"
          class="create-btn"
          @click="navigateToCreate"
        >
          + {{ $t('plans.createPlan') }}
        </button>
      </div>

      <div class="plans-filters">
        <input
          v-model="searchQuery"
          type="text"
          data-testid="search-input"
          :placeholder="$t('common.search')"
          class="search-input"
          @input="handleSearch"
        >
        <select
          v-model="filterCategory"
          data-testid="filter-category"
          class="filter-select"
          :aria-label="$t('plans.categories')"
        >
          <option value="">
            {{ $t('plans.allCategories') }}
          </option>
          <option value="__none__">
            {{ $t('plans.uncategorized') }}
          </option>
          <option
            v-for="cat in categories"
            :key="cat.id"
            :value="cat.id"
          >
            {{ cat.name }}
          </option>
        </select>
        <select
          v-model="filterBillingPeriod"
          data-testid="filter-billing-period"
          class="filter-select"
          :aria-label="$t('plans.billingPeriod')"
        >
          <option value="">
            {{ $t('plans.allBillingPeriods') }}
          </option>
          <option
            v-for="period in billingPeriodOptions"
            :key="period"
            :value="period"
          >
            {{ billingLabel(period) }}
          </option>
        </select>
        <label class="checkbox-label">
          <input
            v-model="includeArchived"
            type="checkbox"
            data-testid="include-archived"
            @change="fetchPlans"
          >
          {{ $t('plans.includeArchived') }}
        </label>
      </div>

      <!-- Bulk Actions -->
      <div
        v-if="canManage && selectedPlans.size > 0"
        class="bulk-actions"
        data-testid="bulk-actions"
      >
        <span class="selection-info">{{ $t('common.selected', { count: selectedPlans.size }) }}</span>
        <div
          class="bulk-assign-group"
          data-testid="bulk-assign-category"
        >
          <select
            v-model="assignCategoryId"
            class="bulk-assign-select"
            data-testid="bulk-assign-category-select"
            :disabled="processingBulk || categories.length === 0"
            :aria-label="$t('plans.bulkAssignCategory')"
          >
            <option value="">
              {{ $t('plans.selectCategoryToAssign') }}
            </option>
            <option
              v-for="cat in categories"
              :key="cat.id"
              :value="cat.id"
            >
              {{ cat.name }}
            </option>
          </select>
          <button
            class="bulk-btn assign"
            :disabled="processingBulk || !assignCategoryId"
            data-testid="bulk-assign-category-btn"
            @click="handleBulkAssignCategory"
          >
            {{ $t('plans.bulkAssignCategory') }}
          </button>
        </div>
        <button
          class="bulk-btn activate"
          :disabled="processingBulk"
          data-testid="bulk-activate-btn"
          @click="handleBulkActivate"
        >
          {{ $t('plans.bulkActivate') }}
        </button>
        <button
          class="bulk-btn deactivate"
          :disabled="processingBulk"
          data-testid="bulk-deactivate-btn"
          @click="handleBulkDeactivate"
        >
          {{ $t('plans.bulkDeactivate') }}
        </button>
        <button
          class="bulk-btn copy"
          :disabled="processingBulk"
          data-testid="bulk-copy"
          @click="handleBulkCopy"
        >
          {{ $t('subscription.makeACopy', 'Make a copy') }}
        </button>
        <button
          class="bulk-btn delete"
          :disabled="processingBulk"
          data-testid="bulk-delete-btn"
          @click="handleBulkDelete"
        >
          {{ $t('plans.bulkDelete') }}
        </button>
      </div>

      <!-- Bulk Messages -->
      <div
        v-if="bulkSuccessMessage"
        class="bulk-message success"
        data-testid="bulk-success-message"
        role="alert"
      >
        {{ bulkSuccessMessage }}
      </div>
      <div
        v-if="bulkErrorMessage"
        class="bulk-message error"
        data-testid="bulk-error-message"
        role="alert"
      >
        <strong>Error:</strong> {{ bulkErrorMessage }}
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
          @click="fetchPlans"
        >
          {{ $t('common.retry') }}
        </button>
      </div>

      <div
        v-else-if="plans.length === 0"
        data-testid="empty-state"
        class="empty-state"
      >
        <p>{{ $t('common.noResults') }}</p>
        <button
          class="create-btn"
          @click="navigateToCreate"
        >
          {{ $t('plans.createFirstPlan') }}
        </button>
      </div>

      <div
        v-else
        class="plans-table-wrap"
      >
        <table
          data-testid="plans-table"
          class="plans-table"
        >
          <thead>
            <tr>
              <th class="checkbox-col">
                <input
                  type="checkbox"
                  :checked="allVisibleSelected && sortedPlans.length > 0"
                  :indeterminate="selectedPlans.size > 0 && !allVisibleSelected"
                  data-testid="select-all-checkbox"
                  @change="toggleSelectAll"
                >
              </th>
              <th
                class="sortable"
                :class="{ sorted: sortColumn === 'name', 'sort-asc': sortColumn === 'name' && sortDirection === 'asc', 'sort-desc': sortColumn === 'name' && sortDirection === 'desc' }"
                data-sortable="name"
                @click="handleSort('name')"
              >
                {{ $t('plans.name') }}
                <span class="sort-indicator">{{ getSortIndicator('name') }}</span>
              </th>
              <th
                class="sortable"
                :class="{ sorted: sortColumn === 'price', 'sort-asc': sortColumn === 'price' && sortDirection === 'asc', 'sort-desc': sortColumn === 'price' && sortDirection === 'desc' }"
                data-sortable="price"
                @click="handleSort('price')"
              >
                {{ $t('plans.price') }}
                <span class="sort-indicator">{{ getSortIndicator('price') }}</span>
              </th>
              <th
                class="sortable"
                :class="{ sorted: sortColumn === 'billing_period', 'sort-asc': sortColumn === 'billing_period' && sortDirection === 'asc', 'sort-desc': sortColumn === 'billing_period' && sortDirection === 'desc' }"
                data-sortable="billing_period"
                @click="handleSort('billing_period')"
              >
                {{ $t('plans.billingPeriod') }}
                <span class="sort-indicator">{{ getSortIndicator('billing_period') }}</span>
              </th>
              <th
                class="sortable"
                :class="{ sorted: sortColumn === 'subscriber_count', 'sort-asc': sortColumn === 'subscriber_count' && sortDirection === 'asc', 'sort-desc': sortColumn === 'subscriber_count' && sortDirection === 'desc' }"
                data-sortable="subscriber_count"
                @click="handleSort('subscriber_count')"
              >
                {{ $t('plans.subscribers') }}
                <span class="sort-indicator">{{ getSortIndicator('subscriber_count') }}</span>
              </th>
              <th
                class="sortable"
                :class="{ sorted: sortColumn === 'categories', 'sort-asc': sortColumn === 'categories' && sortDirection === 'asc', 'sort-desc': sortColumn === 'categories' && sortDirection === 'desc' }"
                data-sortable="categories"
                @click="handleSort('categories')"
              >
                {{ $t('plans.categories') }}
                <span class="sort-indicator">{{ getSortIndicator('categories') }}</span>
              </th>
              <th
                class="sortable"
                :class="{ sorted: sortColumn === 'status', 'sort-asc': sortColumn === 'status' && sortDirection === 'asc', 'sort-desc': sortColumn === 'status' && sortDirection === 'desc' }"
                data-sortable="status"
                @click="handleSort('status')"
              >
                {{ $t('common.status') }}
                <span class="sort-indicator">{{ getSortIndicator('status') }}</span>
              </th>
              <th>{{ $t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="plan in sortedPlans"
              :key="plan.id"
              :data-testid="`plan-row-${plan.id}`"
              class="plan-row"
              :class="{ selected: selectedPlans.has(plan.id) }"
            >
              <td
                class="checkbox-col"
                @click.stop
              >
                <input
                  type="checkbox"
                  :checked="selectedPlans.has(plan.id)"
                  :data-testid="`select-plan-${plan.id}`"
                  @change="togglePlan(plan.id)"
                >
              </td>
              <td @click="navigateToPlan(plan.id)">
                {{ plan.name }}
              </td>
              <td>{{ formatPrice(planPriceValue(plan), planPriceCurrency(plan)) }}</td>
              <td>{{ plan.billing_period }}</td>
              <td>{{ plan.subscriber_count ?? 0 }}</td>
              <td class="categories-cell">
                <span
                  v-for="cat in (plan.categories || [])"
                  :key="cat.id"
                  class="category-slug"
                >{{ cat.slug }}</span>
                <span
                  v-if="!plan.categories || plan.categories.length === 0"
                  class="no-category"
                >—</span>
              </td>
              <td>
                <span
                  v-if="plan.is_active"
                  data-testid="status-active"
                  class="status-badge active"
                >
                  {{ $t('common.active') }}
                </span>
                <span
                  v-else
                  data-testid="status-inactive"
                  class="status-badge inactive"
                >
                  {{ $t('common.inactive') }}
                </span>
              </td>
              <td @click.stop>
                <button
                  v-if="canManage && plan.is_active"
                  :data-testid="`archive-plan-${plan.id}`"
                  class="action-btn archive"
                  @click="handleArchive(plan.id)"
                >
                  {{ $t('plans.archive') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { formatMoney, getOperatingCurrency } from 'vbwd-view-component';
import { useAuthStore } from '@/stores/auth';
import { usePlanAdminStore, type AdminPlan } from '../stores/planAdmin';
import { useCategoryAdminStore } from '../stores/categoryAdmin';
import CategoriesTab from '../components/CategoriesTab.vue';

const router = useRouter();
const { t } = useI18n();
const authStore = useAuthStore();
const planStore = usePlanAdminStore();
const categoryStore = useCategoryAdminStore();

const canManage = computed(() => authStore.hasPermission('subscription.plans.manage'));

const activeTab = ref<'plans' | 'categories'>('plans');
const includeArchived = ref(false);
const searchQuery = ref('');
const filterCategory = ref('');
const filterBillingPeriod = ref('');
const assignCategoryId = ref('');
const selectedPlans = ref(new Set<string>());
const processingBulk = ref(false);
const bulkSuccessMessage = ref('');
const bulkErrorMessage = ref('');

// Sorting state
type SortColumn = 'name' | 'price' | 'billing_period' | 'subscriber_count' | 'categories' | 'status' | null;
type SortDirection = 'asc' | 'desc';

const sortColumn = ref<SortColumn>(null);
const sortDirection = ref<SortDirection>('asc');

const plans = computed(() => planStore.plans);
const loading = computed(() => planStore.loading);
const error = computed(() => planStore.error);
const categories = computed(() => categoryStore.categories || []);

// Distinct billing periods present in the loaded plans, for the filter dropdown.
const billingPeriodOptions = computed(() => {
  const seen = new Set<string>();
  for (const plan of plans.value) {
    if (plan.billing_period) seen.add(plan.billing_period);
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
});

const BILLING_LABEL_KEYS: Record<string, string> = {
  MONTHLY: 'plans.monthly',
  YEARLY: 'plans.yearly',
  QUARTERLY: 'plans.quarterly',
  WEEKLY: 'plans.weekly',
  ONE_TIME: 'plans.oneTime'
};

function billingLabel(period: string): string {
  const key = BILLING_LABEL_KEYS[String(period).toUpperCase()];
  return key ? t(key) : period;
}

function categorySortKey(plan: { categories?: { slug: string }[] }): string {
  return (plan.categories || [])
    .map(cat => cat.slug)
    .sort((a, b) => a.localeCompare(b))
    .join(',');
}

const allVisibleSelected = computed(() => {
  if (sortedPlans.value.length === 0) return false;
  return sortedPlans.value.every(plan => selectedPlans.value.has(plan.id));
});

// Filtered and sorted plans computed property
const sortedPlans = computed(() => {
  let filtered = plans.value;

  // Quicksearch: match plan name or any assigned category slug.
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(plan =>
      plan.name?.toLowerCase().includes(query) ||
      (plan.categories || []).some(cat =>
        cat.slug?.toLowerCase().includes(query) || cat.name?.toLowerCase().includes(query)
      )
    );
  }

  // Filter by category ("__none__" = uncategorized).
  if (filterCategory.value) {
    filtered = filtered.filter(plan => {
      const cats = plan.categories || [];
      if (filterCategory.value === '__none__') return cats.length === 0;
      return cats.some(cat => cat.id === filterCategory.value);
    });
  }

  // Filter by billing period.
  if (filterBillingPeriod.value) {
    filtered = filtered.filter(plan => plan.billing_period === filterBillingPeriod.value);
  }

  if (!sortColumn.value) return filtered;

  return [...filtered].sort((a, b) => {
    let aVal: string | number | boolean | undefined;
    let bVal: string | number | boolean | undefined;

    switch (sortColumn.value) {
      case 'name':
        aVal = a.name?.toLowerCase() || '';
        bVal = b.name?.toLowerCase() || '';
        break;
      case 'price':
        aVal = planPriceValue(a) ?? 0;
        bVal = planPriceValue(b) ?? 0;
        break;
      case 'billing_period':
        aVal = a.billing_period?.toLowerCase() || '';
        bVal = b.billing_period?.toLowerCase() || '';
        break;
      case 'subscriber_count':
        aVal = a.subscriber_count ?? 0;
        bVal = b.subscriber_count ?? 0;
        break;
      case 'categories':
        aVal = categorySortKey(a);
        bVal = categorySortKey(b);
        break;
      case 'status':
        aVal = a.is_active;
        bVal = b.is_active;
        break;
      default:
        return 0;
    }

    let comparison = 0;
    if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
      comparison = aVal === bVal ? 0 : aVal ? -1 : 1;
    } else if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal;
    } else {
      comparison = String(aVal).localeCompare(String(bVal));
    }

    return sortDirection.value === 'asc' ? comparison : -comparison;
  });
});

function handleSort(column: SortColumn): void {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn.value = column;
    sortDirection.value = 'asc';
  }
}

function getSortIndicator(column: SortColumn): string {
  if (sortColumn.value !== column) return '';
  return sortDirection.value === 'asc' ? '▲' : '▼';
}

function handleSearch(): void {
  // Client-side filtering is handled by the computed property
  // This function is here for consistency and future server-side search
}

async function fetchPlans(): Promise<void> {
  try {
    await planStore.fetchPlans(includeArchived.value);
  } catch {
    // Error is already set in the store
  }
}

function navigateToCreate(): void {
  router.push('/admin/plans/new');
}

function navigateToPlan(planId: string): void {
  router.push(`/admin/plans/${planId}/edit`);
}

async function handleArchive(planId: string): Promise<void> {
  try {
    await planStore.archivePlan(planId);
    await fetchPlans();
  } catch {
    // Error is already set in the store
  }
}

// Derive the numeric price from whichever wire shape the admin API sends: the
// real list endpoint returns `price` as a plain number; older/object shapes
// carry `price.price_float`; a few callers still send a top-level `price_float`.
function planPriceValue(plan: AdminPlan): number | undefined {
  if (typeof plan.price === 'number') return plan.price;
  if (plan.price && typeof plan.price === 'object' && plan.price.price_float != null) {
    return plan.price.price_float;
  }
  return plan.price_float;
}

// Derive the currency: object price carries its own `currency_code`, else the
// plan's top-level `currency` (formatPrice falls back to operating currency).
function planPriceCurrency(plan: AdminPlan): string | undefined {
  if (plan.price && typeof plan.price === 'object') return plan.price.currency_code;
  return plan.currency;
}

function formatPrice(price: number | undefined, currency?: string): string {
  if (price === undefined || price === null) return 'N/A';
  if (price === 0) return 'Free';
  return formatMoney(price, { currency: currency ?? getOperatingCurrency() });
}

function togglePlan(planId: string): void {
  if (selectedPlans.value.has(planId)) {
    selectedPlans.value.delete(planId);
  } else {
    selectedPlans.value.add(planId);
  }
}

function toggleSelectAll(): void {
  if (allVisibleSelected.value) {
    sortedPlans.value.forEach(plan => selectedPlans.value.delete(plan.id));
  } else {
    sortedPlans.value.forEach(plan => selectedPlans.value.add(plan.id));
  }
}

async function handleBulkActivate(): Promise<void> {
  if (selectedPlans.value.size === 0) return;

  if (!confirm(`Activate ${selectedPlans.value.size} plan(s)?`)) {
    return;
  }

  processingBulk.value = true;
  bulkErrorMessage.value = '';
  bulkSuccessMessage.value = '';

  try {
    const planIds = Array.from(selectedPlans.value);
    let successCount = 0;
    let errorCount = 0;

    for (const planId of planIds) {
      try {
        await planStore.updatePlan(planId, { is_active: true });
        successCount++;
      } catch {
        errorCount++;
      }
    }

    selectedPlans.value.clear();
    bulkSuccessMessage.value = `${successCount} plan(s) activated${errorCount > 0 ? `, ${errorCount} failed` : ''}`;
    await fetchPlans();
    setTimeout(() => {
      bulkSuccessMessage.value = '';
    }, 3000);
  } catch (err) {
    bulkErrorMessage.value = (err as Error).message || 'Failed to activate plans';
  } finally {
    processingBulk.value = false;
  }
}

async function handleBulkCopy(): Promise<void> {
  if (selectedPlans.value.size === 0) return;

  if (!confirm(`Copy ${selectedPlans.value.size} plan(s)?`)) {
    return;
  }

  processingBulk.value = true;
  bulkErrorMessage.value = '';
  bulkSuccessMessage.value = '';

  try {
    const planIds = Array.from(selectedPlans.value);
    const result = await planStore.bulkCopyPlans(planIds);
    const copiedCount = result?.count ?? planIds.length;

    selectedPlans.value.clear();
    bulkSuccessMessage.value = `${copiedCount} plan(s) copied`;
    await fetchPlans();
    setTimeout(() => {
      bulkSuccessMessage.value = '';
    }, 3000);
  } catch (err) {
    bulkErrorMessage.value = (err as Error).message || 'Failed to copy plans';
  } finally {
    processingBulk.value = false;
  }
}

async function handleBulkDeactivate(): Promise<void> {
  if (selectedPlans.value.size === 0) return;

  if (!confirm(`Deactivate ${selectedPlans.value.size} plan(s)?`)) {
    return;
  }

  processingBulk.value = true;
  bulkErrorMessage.value = '';
  bulkSuccessMessage.value = '';

  try {
    const planIds = Array.from(selectedPlans.value);
    let successCount = 0;
    let errorCount = 0;

    for (const planId of planIds) {
      try {
        await planStore.updatePlan(planId, { is_active: false });
        successCount++;
      } catch {
        errorCount++;
      }
    }

    selectedPlans.value.clear();
    bulkSuccessMessage.value = `${successCount} plan(s) deactivated${errorCount > 0 ? `, ${errorCount} failed` : ''}`;
    await fetchPlans();
    setTimeout(() => {
      bulkSuccessMessage.value = '';
    }, 3000);
  } catch (err) {
    bulkErrorMessage.value = (err as Error).message || 'Failed to deactivate plans';
  } finally {
    processingBulk.value = false;
  }
}

async function handleBulkDelete(): Promise<void> {
  if (selectedPlans.value.size === 0) return;

  if (!confirm(`Delete ${selectedPlans.value.size} plan(s)? This action cannot be undone.`)) {
    return;
  }

  processingBulk.value = true;
  bulkErrorMessage.value = '';
  bulkSuccessMessage.value = '';

  try {
    const planIds = Array.from(selectedPlans.value);
    let successCount = 0;
    const failedPlans: { id: string; reason: string }[] = [];

    for (const planId of planIds) {
      try {
        await planStore.deletePlan(planId);
        successCount++;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        failedPlans.push({
          id: planId,
          reason: errorMsg
        });
      }
    }

    selectedPlans.value.clear();

    if (successCount > 0) {
      await fetchPlans();
    }

    if (failedPlans.length > 0) {
      const failureDetails = failedPlans.map(p => `${p.id}: ${p.reason}`).join('; ');
      bulkErrorMessage.value = `${successCount} plan(s) deleted. ${failedPlans.length} could not be deleted: ${failureDetails}`;
    } else {
      bulkSuccessMessage.value = `${successCount} plan(s) deleted successfully`;
      setTimeout(() => {
        bulkSuccessMessage.value = '';
      }, 3000);
    }
  } catch (err) {
    bulkErrorMessage.value = (err as Error).message || 'Failed to delete plans';
  } finally {
    processingBulk.value = false;
  }
}

async function handleBulkAssignCategory(): Promise<void> {
  if (selectedPlans.value.size === 0 || !assignCategoryId.value) return;

  const category = categories.value.find(cat => cat.id === assignCategoryId.value);
  const categoryName = category?.name ?? '';

  if (!confirm(`Assign ${selectedPlans.value.size} plan(s) to "${categoryName}"?`)) {
    return;
  }

  processingBulk.value = true;
  bulkErrorMessage.value = '';
  bulkSuccessMessage.value = '';

  try {
    const planIds = Array.from(selectedPlans.value);
    await categoryStore.attachPlans(assignCategoryId.value, planIds);

    selectedPlans.value.clear();
    assignCategoryId.value = '';
    bulkSuccessMessage.value = `${planIds.length} plan(s) assigned to "${categoryName}"`;
    await fetchPlans();
    setTimeout(() => {
      bulkSuccessMessage.value = '';
    }, 3000);
  } catch (err) {
    bulkErrorMessage.value = (err as Error).message || 'Failed to assign category';
  } finally {
    processingBulk.value = false;
  }
}

async function fetchCategories(): Promise<void> {
  try {
    await categoryStore.fetchCategories('flat');
  } catch {
    // Categories are optional for the plans view; ignore fetch errors here.
  }
}

onMounted(() => {
  fetchPlans();
  fetchCategories();
});
</script>

<style scoped>
.plans-view {
  background: white;
  padding: 20px;
  border-radius: 8px;
}

.plans-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.plans-header h2 {
  margin: 0;
  color: #2c3e50;
}

.tabs {
  display: flex;
  gap: 0;
  margin-bottom: 20px;
  border-bottom: 2px solid #e9ecef;
}

.tab-btn {
  padding: 10px 20px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  transition: color 0.2s, border-color 0.2s;
}

.tab-btn:hover {
  color: #2c3e50;
}

.tab-btn.active {
  color: #3498db;
  border-bottom-color: #3498db;
}

.plans-subheader {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 15px;
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

.plans-filters {
  display: flex;
  gap: 15px;
  align-items: center;
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
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  color: #2c3e50;
  cursor: pointer;
}

.filter-select:focus {
  outline: none;
  border-color: #3498db;
}

.bulk-assign-group {
  display: flex;
  gap: 6px;
  align-items: center;
}

.bulk-assign-select {
  padding: 7px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  color: #2c3e50;
  cursor: pointer;
  max-width: 180px;
}

.bulk-assign-select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.bulk-btn.assign {
  background: #e3f2fd;
  color: #1565c0;
}

.bulk-btn.assign:hover:not(:disabled) {
  background: #bbdefb;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #666;
  font-size: 14px;
}

.checkbox-label input {
  cursor: pointer;
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

.plans-table {
  width: 100%;
  border-collapse: collapse;
}

.plans-table th,
.plans-table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.plans-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #2c3e50;
}

.plans-table th.sortable {
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
}

.plans-table th.sortable:hover {
  background: #e9ecef;
}

.plans-table th.sorted {
  background: #e3f2fd;
}

.sort-indicator {
  margin-left: 5px;
  font-size: 0.75rem;
  color: #3498db;
}

.plan-row {
  cursor: pointer;
  transition: background-color 0.2s;
}

.plan-row:hover {
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

.status-badge.inactive {
  background: #f8d7da;
  color: #721c24;
}

.action-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.action-btn.archive {
  background: #ffc107;
  color: #212529;
}

.action-btn.archive:hover {
  background: #e0a800;
}

.categories-cell {
  max-width: 200px;
}

.category-slug {
  display: inline-block;
  padding: 2px 7px;
  margin: 2px 2px 2px 0;
  background: #e3f2fd;
  color: #1565c0;
  border-radius: 10px;
  font-size: 0.75rem;
  font-family: monospace;
  white-space: nowrap;
}

.no-category {
  color: #bbb;
  font-size: 0.85rem;
}

.bulk-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 15px;
  margin-bottom: 20px;
  background: #f0f4f8;
  border-left: 4px solid #3498db;
  border-radius: 4px;
}

.selection-info {
  flex: 1;
  font-weight: 500;
  color: #2c3e50;
}

.bulk-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: opacity 0.2s, background-color 0.2s;
}

.bulk-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.bulk-btn.activate {
  background: #d4edda;
  color: #155724;
}

.bulk-btn.activate:hover:not(:disabled) {
  background: #c3e6cb;
}

.bulk-btn.deactivate {
  background: #fff3cd;
  color: #856404;
}

.bulk-btn.deactivate:hover:not(:disabled) {
  background: #ffeaa7;
}

.bulk-btn.copy {
  background: var(--vbwd-color-info-bg, #d1ecf1);
  color: var(--vbwd-color-info-text, #0c5460);
}

.bulk-btn.copy:hover:not(:disabled) {
  background: var(--vbwd-color-info-bg-hover, #bee5eb);
}

.bulk-btn.delete {
  background: #f8d7da;
  color: #721c24;
}

.bulk-btn.delete:hover:not(:disabled) {
  background: #f5c6cb;
}

.checkbox-col {
  width: 40px;
  text-align: center;
  padding: 0;
}

.plans-table th.checkbox-col {
  padding: 12px 15px;
}

.plans-table td.checkbox-col {
  padding: 12px 15px;
}

.checkbox-col input[type="checkbox"] {
  cursor: pointer;
}

.plan-row.selected {
  background-color: #e3f2fd;
}

.bulk-message {
  padding: 15px 20px;
  border-radius: 4px;
  margin-bottom: 20px;
  font-weight: 500;
  border-left: 5px solid;
}

.bulk-message.success {
  background: #d4edda;
  color: #155724;
  border-color: #28a745;
}

.bulk-message.error {
  background: #f8d7da;
  color: #721c24;
  border-color: #dc3545;
  white-space: pre-wrap;
  word-break: break-word;
}

.plans-table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

@media (max-width: 768px) {
  .plans-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .plans-header h2 {
    font-size: 1.1rem;
  }

  .filters {
    flex-direction: column;
    gap: 10px;
  }

  .search-input {
    width: 100%;
    box-sizing: border-box;
  }

  .bulk-actions {
    flex-wrap: wrap;
    gap: 8px;
  }

  .plans-table {
    min-width: 640px;
  }

  .plans-table th,
  .plans-table td {
    padding: 10px 10px;
    font-size: 0.85rem;
  }
}
</style>
