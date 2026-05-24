<template>
  <div
    class="addons-view"
    data-testid="addons-view"
  >
    <div class="addons-header">
      <h2>{{ $t('addOns.title') }}</h2>
      <button
        v-if="canManage"
        data-testid="create-addon-button"
        class="create-btn"
        @click="navigateToCreate"
      >
        + {{ $t('addOns.createAddon') }}
      </button>
    </div>

    <div class="addons-filters">
      <input
        v-model="searchQuery"
        type="text"
        data-testid="search-input"
        :placeholder="$t('common.search')"
        class="search-input"
      >
      <label class="checkbox-label">
        <input
          v-model="includeInactive"
          type="checkbox"
          data-testid="include-inactive"
          @change="fetchAddons"
        >
        {{ $t('addOns.includeInactive') }}
      </label>
    </div>

    <!-- Bulk Actions -->
    <div
      v-if="canManage && selectedAddons.size > 0"
      class="bulk-actions"
      data-testid="bulk-actions"
    >
      <span class="selection-info">{{ $t('common.selected', { count: selectedAddons.size }) }}</span>
      <button
        class="bulk-btn activate"
        :disabled="processingBulk"
        data-testid="bulk-activate-btn"
        @click="handleBulkActivate"
      >
        {{ $t('addOns.bulkActivate') }}
      </button>
      <button
        class="bulk-btn deactivate"
        :disabled="processingBulk"
        data-testid="bulk-deactivate-btn"
        @click="handleBulkDeactivate"
      >
        {{ $t('addOns.bulkDeactivate') }}
      </button>
      <button
        class="bulk-btn delete"
        :disabled="processingBulk"
        data-testid="bulk-delete-btn"
        @click="handleBulkDelete"
      >
        {{ $t('addOns.bulkDelete') }}
      </button>
    </div>

    <!-- Bulk Messages -->
    <div
      v-if="bulkSuccessMessage"
      class="bulk-message success"
      data-testid="bulk-success-message"
    >
      {{ bulkSuccessMessage }}
    </div>
    <div
      v-if="bulkErrorMessage"
      class="bulk-message error"
      data-testid="bulk-error-message"
    >
      {{ bulkErrorMessage }}
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
        @click="fetchAddons"
      >
        {{ $t('common.retry') }}
      </button>
    </div>

    <div
      v-else-if="addons.length === 0"
      data-testid="empty-state"
      class="empty-state"
    >
      <p>{{ $t('common.noResults') }}</p>
      <button
        class="create-btn"
        @click="navigateToCreate"
      >
        {{ $t('addOns.createFirstAddon') }}
      </button>
    </div>

    <table
      v-else
      data-testid="addons-table"
      class="addons-table"
    >
      <thead>
        <tr>
          <th class="checkbox-col">
            <input
              type="checkbox"
              :checked="allVisibleSelected && sortedAddons.length > 0"
              :indeterminate="selectedAddons.size > 0 && !allVisibleSelected"
              data-testid="select-all-checkbox"
              @change="toggleSelectAll"
            >
          </th>
          <th
            class="sortable"
            :class="{ sorted: sortColumn === 'name' }"
            @click="handleSort('name')"
          >
            {{ $t('addOns.name') }}
            <span class="sort-indicator">{{ getSortIndicator('name') }}</span>
          </th>
          <th>{{ $t('addOns.slug') }}</th>
          <th
            class="sortable"
            :class="{ sorted: sortColumn === 'price' }"
            @click="handleSort('price')"
          >
            {{ $t('addOns.price') }}
            <span class="sort-indicator">{{ getSortIndicator('price') }}</span>
          </th>
          <th>{{ $t('addOns.plans') }}</th>
          <th>{{ $t('addOns.billingPeriod') }}</th>
          <th
            class="sortable"
            :class="{ sorted: sortColumn === 'status' }"
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
          v-for="addon in sortedAddons"
          :key="addon.id"
          :data-testid="`addon-row-${addon.id}`"
          class="addon-row"
          :class="{ selected: selectedAddons.has(addon.id) }"
          style="cursor: pointer"
          @click="navigateToAddon(addon.id)"
        >
          <td
            class="checkbox-col"
            @click.stop
          >
            <input
              type="checkbox"
              :checked="selectedAddons.has(addon.id)"
              :data-testid="`select-addon-${addon.id}`"
              @change="toggleAddon(addon.id)"
            >
          </td>
          <td>
            {{ addon.name }}
          </td>
          <td><code>{{ addon.slug }}</code></td>
          <td>{{ formatPrice(addon.price, addon.currency) }}</td>
          <td data-testid="addon-plans">
            <span
              v-if="!addon.tarif_plans || addon.tarif_plans.length === 0"
              class="plan-badge all-plans"
            >
              {{ $t('addOns.allPlans') }}
            </span>
            <span
              v-for="plan in (addon.tarif_plans || [])"
              v-else
              :key="plan.id"
              class="plan-badge"
            >
              {{ plan.name }}
            </span>
          </td>
          <td>{{ formatBillingPeriod(addon.billing_period) }}</td>
          <td>
            <span
              v-if="addon.is_active"
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
            <template v-if="canManage">
              <button
                v-if="addon.is_active"
                :data-testid="`deactivate-addon-${addon.id}`"
                class="action-btn deactivate"
                @click="handleDeactivate(addon.id)"
              >
                {{ $t('addOns.deactivateAddon') }}
              </button>
              <button
                v-else
                :data-testid="`activate-addon-${addon.id}`"
                class="action-btn activate"
                @click="handleActivate(addon.id)"
              >
                {{ $t('addOns.activateAddon') }}
              </button>
              <button
                :data-testid="`delete-addon-${addon.id}`"
                class="action-btn delete"
                @click="handleDelete(addon.id)"
              >
                {{ $t('addOns.deleteAddon') }}
              </button>
            </template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import { useAddonStore } from '../stores/addons';

const { t } = useI18n();
const router = useRouter();
const authStore = useAuthStore();
const addonStore = useAddonStore();

const canManage = computed(() => authStore.hasPermission('subscription.addons.manage'));

const includeInactive = ref(true);
const searchQuery = ref('');
const selectedAddons = ref(new Set<string>());
const processingBulk = ref(false);
const bulkSuccessMessage = ref('');
const bulkErrorMessage = ref('');

type SortColumn = 'name' | 'price' | 'status' | null;
type SortDirection = 'asc' | 'desc';

const sortColumn = ref<SortColumn>(null);
const sortDirection = ref<SortDirection>('asc');

const addons = computed(() => addonStore.addons);
const loading = computed(() => addonStore.loading);
const error = computed(() => addonStore.error);

const sortedAddons = computed(() => {
  let filtered = addons.value;
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filtered = addons.value.filter(addon =>
      addon.name?.toLowerCase().includes(query) ||
      addon.slug?.toLowerCase().includes(query)
    );
  }

  if (!sortColumn.value) return filtered;

  return [...filtered].sort((a, b) => {
    let comparison = 0;

    switch (sortColumn.value) {
      case 'name':
        comparison = (a.name || '').localeCompare(b.name || '');
        break;
      case 'price':
        comparison = parseFloat(a.price || '0') - parseFloat(b.price || '0');
        break;
      case 'status':
        comparison = a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1;
        break;
    }

    return sortDirection.value === 'asc' ? comparison : -comparison;
  });
});

const allVisibleSelected = computed(() => {
  if (sortedAddons.value.length === 0) return false;
  return sortedAddons.value.every(addon => selectedAddons.value.has(addon.id));
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

async function fetchAddons(): Promise<void> {
  try {
    await addonStore.fetchAddons(1, 20, includeInactive.value);
  } catch {
    // Error is already set in the store
  }
}

function navigateToCreate(): void {
  router.push('/admin/add-ons/new');
}

function navigateToAddon(addonId: string): void {
  router.push(`/admin/add-ons/${addonId}/edit`);
}

async function handleActivate(addonId: string): Promise<void> {
  try {
    await addonStore.activateAddon(addonId);
    await fetchAddons();
  } catch {
    // Error is already set in the store
  }
}

async function handleDeactivate(addonId: string): Promise<void> {
  try {
    await addonStore.deactivateAddon(addonId);
    await fetchAddons();
  } catch {
    // Error is already set in the store
  }
}

async function handleDelete(addonId: string): Promise<void> {
  if (!confirm(t('addOns.confirmDelete'))) return;
  try {
    await addonStore.deleteAddon(addonId);
    await fetchAddons();
  } catch {
    // Error is already set in the store
  }
}

function formatPrice(price: string | number | undefined, currency?: string): string {
  if (price === undefined || price === null) return 'N/A';
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (numPrice === 0) return t('common.free') || 'Free';
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency || '€';
  return `${symbol}${numPrice.toFixed(2)}`;
}

function formatBillingPeriod(period: string): string {
  if (!period) return '';
  const key = `addOns.${period.toLowerCase()}` as string;
  const translated = t(key);
  return translated !== key ? translated : period;
}

function toggleAddon(addonId: string): void {
  if (selectedAddons.value.has(addonId)) {
    selectedAddons.value.delete(addonId);
  } else {
    selectedAddons.value.add(addonId);
  }
}

function toggleSelectAll(): void {
  if (allVisibleSelected.value) {
    sortedAddons.value.forEach(addon => selectedAddons.value.delete(addon.id));
  } else {
    sortedAddons.value.forEach(addon => selectedAddons.value.add(addon.id));
  }
}

async function handleBulkActivate(): Promise<void> {
  if (selectedAddons.value.size === 0) return;

  processingBulk.value = true;
  bulkErrorMessage.value = '';
  bulkSuccessMessage.value = '';

  try {
    const addonIds = Array.from(selectedAddons.value);
    let successCount = 0;
    let errorCount = 0;

    for (const addonId of addonIds) {
      try {
        await addonStore.activateAddon(addonId);
        successCount++;
      } catch {
        errorCount++;
      }
    }

    selectedAddons.value.clear();
    bulkSuccessMessage.value = `${successCount} add-on(s) activated${errorCount > 0 ? `, ${errorCount} failed` : ''}`;
    await fetchAddons();
    setTimeout(() => {
      bulkSuccessMessage.value = '';
    }, 3000);
  } catch (err) {
    bulkErrorMessage.value = (err as Error).message || 'Failed to activate add-ons';
  } finally {
    processingBulk.value = false;
  }
}

async function handleBulkDeactivate(): Promise<void> {
  if (selectedAddons.value.size === 0) return;

  processingBulk.value = true;
  bulkErrorMessage.value = '';
  bulkSuccessMessage.value = '';

  try {
    const addonIds = Array.from(selectedAddons.value);
    let successCount = 0;
    let errorCount = 0;

    for (const addonId of addonIds) {
      try {
        await addonStore.deactivateAddon(addonId);
        successCount++;
      } catch {
        errorCount++;
      }
    }

    selectedAddons.value.clear();
    bulkSuccessMessage.value = `${successCount} add-on(s) deactivated${errorCount > 0 ? `, ${errorCount} failed` : ''}`;
    await fetchAddons();
    setTimeout(() => {
      bulkSuccessMessage.value = '';
    }, 3000);
  } catch (err) {
    bulkErrorMessage.value = (err as Error).message || 'Failed to deactivate add-ons';
  } finally {
    processingBulk.value = false;
  }
}

async function handleBulkDelete(): Promise<void> {
  if (selectedAddons.value.size === 0) return;

  if (!confirm(t('addOns.confirmDeleteBulk'))) {
    return;
  }

  processingBulk.value = true;
  bulkErrorMessage.value = '';
  bulkSuccessMessage.value = '';

  try {
    const addonIds = Array.from(selectedAddons.value);
    let successCount = 0;
    const failedAddons: { id: string; reason: string }[] = [];

    for (const addonId of addonIds) {
      try {
        await addonStore.deleteAddon(addonId);
        successCount++;
      } catch (err) {
        failedAddons.push({
          id: addonId,
          reason: (err as Error).message || 'Failed to delete'
        });
      }
    }

    selectedAddons.value.clear();

    if (successCount > 0) {
      await fetchAddons();
    }

    if (failedAddons.length > 0) {
      const reasons = failedAddons.map(a => a.reason).join(', ');
      bulkErrorMessage.value = `${successCount} add-on(s) deleted. ${failedAddons.length} could not be deleted: ${reasons}`;
    } else {
      bulkSuccessMessage.value = `${successCount} add-on(s) deleted successfully`;
      setTimeout(() => {
        bulkSuccessMessage.value = '';
      }, 3000);
    }
  } catch (err) {
    bulkErrorMessage.value = (err as Error).message || 'Failed to delete add-ons';
  } finally {
    processingBulk.value = false;
  }
}

onMounted(() => {
  fetchAddons();
});
</script>

<style scoped>
.addons-view {
  background: white;
  padding: 20px;
  border-radius: 8px;
}

.addons-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.addons-header h2 {
  margin: 0;
  color: #2c3e50;
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

.addons-filters {
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

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #666;
  font-size: 14px;
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

.addons-table {
  width: 100%;
  border-collapse: collapse;
}

.addons-table th,
.addons-table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.addons-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #2c3e50;
}

.addons-table th.sortable {
  cursor: pointer;
  user-select: none;
}

.addons-table th.sortable:hover {
  background: #e9ecef;
}

.addons-table th.sorted {
  background: #e3f2fd;
}

.sort-indicator {
  margin-left: 5px;
  font-size: 0.75rem;
  color: #3498db;
}

.addon-row {
  cursor: pointer;
  transition: background-color 0.2s;
}

.addon-row:hover {
  background-color: #f8f9fa;
}

.addon-row code {
  font-size: 0.85em;
  color: #666;
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
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
  margin-right: 4px;
}

.action-btn.activate {
  background: #28a745;
  color: white;
}

.action-btn.deactivate {
  background: #ffc107;
  color: #212529;
}

.action-btn.delete {
  background: #dc3545;
  color: white;
}

.action-btn:hover {
  opacity: 0.85;
}

.plan-badge {
  display: inline-block;
  padding: 2px 8px;
  margin: 1px 3px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 500;
  background: #e3f2fd;
  color: #1565c0;
}

.plan-badge.all-plans {
  background: #e8f5e9;
  color: #2e7d32;
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

.addons-table th.checkbox-col {
  padding: 12px 15px;
}

.addons-table td.checkbox-col {
  padding: 12px 15px;
}

.checkbox-col input[type="checkbox"] {
  cursor: pointer;
}

.addon-row.selected {
  background-color: #e3f2fd;
}

.bulk-message {
  padding: 12px 15px;
  border-radius: 4px;
  margin-bottom: 15px;
  font-weight: 500;
}

.bulk-message.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.bulk-message.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}
</style>
