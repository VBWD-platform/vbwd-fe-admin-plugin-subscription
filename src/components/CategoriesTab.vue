<template>
  <div
    class="categories-tab"
    data-testid="categories-tab"
  >
    <div class="categories-header">
      <button
        data-testid="create-category-button"
        class="create-btn"
        @click="navigateToCreate"
      >
        + {{ $t('categories.createCategory') }}
      </button>
    </div>

    <!-- Bulk Actions -->
    <div
      v-if="selectedCategories.size > 0"
      class="bulk-actions"
      data-testid="bulk-actions"
    >
      <span class="selection-info">{{ $t('common.selected', { count: selectedCategories.size }) }}</span>
      <div
        class="bulk-assign-group"
        data-testid="bulk-assign-parent"
      >
        <select
          v-model="assignParentId"
          class="bulk-assign-select"
          data-testid="bulk-assign-parent-select"
          :disabled="processingBulk || parentOptions.length === 0"
          :aria-label="$t('categories.bulkAssignParent')"
        >
          <option value="">
            {{ $t('categories.selectParent') }}
          </option>
          <option
            v-for="cat in parentOptions"
            :key="cat.id"
            :value="cat.id"
          >
            {{ cat.name }}
          </option>
        </select>
        <button
          class="bulk-btn assign"
          :disabled="processingBulk || !assignParentId"
          data-testid="bulk-assign-parent-btn"
          @click="handleBulkAssignParent"
        >
          {{ $t('categories.bulkAssignParent') }}
        </button>
      </div>
      <button
        class="bulk-btn unassign"
        :disabled="processingBulk"
        data-testid="bulk-unassign-parent-btn"
        @click="handleBulkUnassignParent"
      >
        {{ $t('categories.bulkUnassignParent') }}
      </button>
      <button
        class="bulk-btn delete"
        :disabled="processingBulk"
        data-testid="bulk-delete-btn"
        @click="handleBulkDelete"
      >
        {{ $t('common.delete') }}
      </button>
    </div>

    <!-- Bulk Messages -->
    <div
      v-if="bulkMessage"
      class="bulk-message success"
      data-testid="bulk-success-message"
      role="alert"
    >
      {{ bulkMessage }}
    </div>
    <div
      v-if="bulkError"
      class="bulk-message error"
      data-testid="bulk-error-message"
      role="alert"
    >
      {{ bulkError }}
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
        @click="fetchCategories"
      >
        {{ $t('common.retry') }}
      </button>
    </div>

    <div
      v-else-if="categories.length === 0"
      data-testid="empty-state"
      class="empty-state"
    >
      <p>{{ $t('categories.noCategories') }}</p>
    </div>

    <table
      v-else
      data-testid="categories-table"
      class="categories-table"
    >
      <thead>
        <tr>
          <th class="checkbox-col">
            <input
              type="checkbox"
              :checked="allSelected && categories.length > 0"
              :indeterminate="selectedCategories.size > 0 && !allSelected"
              @change="toggleSelectAll"
            >
          </th>
          <th>{{ $t('categories.name') }}</th>
          <th>{{ $t('categories.slug') }}</th>
          <th>{{ $t('categories.type') }}</th>
          <th>{{ $t('categories.planCount') }}</th>
          <th>{{ $t('categories.parent') }}</th>
          <th>{{ $t('common.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="category in categories"
          :key="category.id"
          :data-testid="`category-row-${category.id}`"
          class="category-row"
          :class="{ selected: selectedCategories.has(category.id) }"
        >
          <td
            class="checkbox-col"
            @click.stop
          >
            <input
              type="checkbox"
              :checked="selectedCategories.has(category.id)"
              :disabled="category.slug === 'root'"
              @change="toggleCategory(category.id)"
            >
          </td>
          <td>{{ category.name }}</td>
          <td><code>{{ category.slug }}</code></td>
          <td>
            <span
              class="type-badge"
              :class="category.is_single ? 'single' : 'multi'"
            >
              {{ category.is_single ? 'Single' : 'Multi' }}
            </span>
          </td>
          <td>{{ category.plan_count }}</td>
          <td>{{ getParentName(category.parent_id) }}</td>
          <td @click.stop>
            <button
              class="action-btn edit"
              :data-testid="`edit-category-${category.id}`"
              @click="navigateToEdit(category.id)"
            >
              {{ $t('common.edit') }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useCategoryAdminStore } from '../stores/categoryAdmin';

const props = defineProps<{
  active: boolean;
}>();

const router = useRouter();
const categoryStore = useCategoryAdminStore();

const selectedCategories = ref(new Set<string>());
const processingBulk = ref(false);
const loaded = ref(false);
const assignParentId = ref('');
const bulkMessage = ref('');
const bulkError = ref('');

const categories = computed(() => categoryStore.categories || []);
const loading = computed(() => categoryStore.loading);
const error = computed(() => categoryStore.error);

const allSelected = computed(() => {
  const selectable = categories.value.filter(c => c.slug !== 'root');
  if (selectable.length === 0) return false;
  return selectable.every(c => selectedCategories.value.has(c.id));
});

// Candidate parents: any category not itself in the current selection
// (a category cannot be its own parent).
const parentOptions = computed(() =>
  categories.value.filter(c => !selectedCategories.value.has(c.id))
);

watch(() => props.active, (isActive) => {
  if (isActive && !loaded.value) {
    fetchCategories();
    loaded.value = true;
  }
}, { immediate: true });

async function fetchCategories(): Promise<void> {
  try {
    await categoryStore.fetchCategories('flat');
  } catch {
    // Error is set in the store
  }
}

function getParentName(parentId: string | null): string {
  if (!parentId) return '—';
  const parent = categories.value.find(c => c.id === parentId);
  return parent?.name || parentId;
}

function navigateToCreate(): void {
  router.push('/admin/plans/categories/new');
}

function navigateToEdit(categoryId: string): void {
  router.push(`/admin/plans/categories/${categoryId}/edit`);
}

function toggleCategory(categoryId: string): void {
  if (selectedCategories.value.has(categoryId)) {
    selectedCategories.value.delete(categoryId);
  } else {
    selectedCategories.value.add(categoryId);
  }
}

function toggleSelectAll(): void {
  const selectable = categories.value.filter(c => c.slug !== 'root');
  if (allSelected.value) {
    selectable.forEach(c => selectedCategories.value.delete(c.id));
  } else {
    selectable.forEach(c => selectedCategories.value.add(c.id));
  }
}

async function handleBulkAssignParent(): Promise<void> {
  if (selectedCategories.value.size === 0 || !assignParentId.value) return;

  const parent = categories.value.find(c => c.id === assignParentId.value);
  const parentName = parent?.name ?? '';
  if (!confirm(`Assign ${selectedCategories.value.size} category(ies) under "${parentName}"?`)) return;

  processingBulk.value = true;
  bulkMessage.value = '';
  bulkError.value = '';
  try {
    // Guard against self-parenting even if the option slipped through.
    const ids = Array.from(selectedCategories.value).filter(id => id !== assignParentId.value);
    let successCount = 0;
    let errorCount = 0;
    for (const id of ids) {
      try {
        await categoryStore.updateCategory(id, { parent_id: assignParentId.value });
        successCount++;
      } catch {
        errorCount++;
      }
    }
    selectedCategories.value.clear();
    assignParentId.value = '';
    bulkMessage.value = `${successCount} category(ies) reparented${errorCount > 0 ? `, ${errorCount} failed` : ''}`;
    await fetchCategories();
    setTimeout(() => { bulkMessage.value = ''; }, 3000);
  } catch (err) {
    bulkError.value = (err as Error).message || 'Failed to assign parent';
  } finally {
    processingBulk.value = false;
  }
}

async function handleBulkUnassignParent(): Promise<void> {
  if (selectedCategories.value.size === 0) return;
  if (!confirm(`Remove the parent from ${selectedCategories.value.size} category(ies)?`)) return;

  processingBulk.value = true;
  bulkMessage.value = '';
  bulkError.value = '';
  try {
    const ids = Array.from(selectedCategories.value);
    let successCount = 0;
    let errorCount = 0;
    for (const id of ids) {
      try {
        await categoryStore.updateCategory(id, { parent_id: null });
        successCount++;
      } catch {
        errorCount++;
      }
    }
    selectedCategories.value.clear();
    bulkMessage.value = `${successCount} category(ies) unassigned${errorCount > 0 ? `, ${errorCount} failed` : ''}`;
    await fetchCategories();
    setTimeout(() => { bulkMessage.value = ''; }, 3000);
  } catch (err) {
    bulkError.value = (err as Error).message || 'Failed to unassign parent';
  } finally {
    processingBulk.value = false;
  }
}

async function handleBulkDelete(): Promise<void> {
  if (selectedCategories.value.size === 0) return;
  if (!confirm(`Delete ${selectedCategories.value.size} category(ies)?`)) return;

  processingBulk.value = true;
  try {
    const ids = Array.from(selectedCategories.value);
    for (const id of ids) {
      try {
        await categoryStore.deleteCategory(id);
      } catch {
        // continue with others
      }
    }
    selectedCategories.value.clear();
    await fetchCategories();
  } finally {
    processingBulk.value = false;
  }
}
</script>

<style scoped>
.categories-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
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

.categories-table {
  width: 100%;
  border-collapse: collapse;
}

.categories-table th,
.categories-table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.categories-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #2c3e50;
}

.category-row {
  transition: background-color 0.2s;
}

.category-row:hover {
  background-color: #f8f9fa;
}

.category-row.selected {
  background-color: #e3f2fd;
}

.checkbox-col {
  width: 40px;
  text-align: center;
}

.type-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.type-badge.single {
  background: #d4edda;
  color: #155724;
}

.type-badge.multi {
  background: #cce5ff;
  color: #004085;
}

.action-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.action-btn.edit {
  background: #3498db;
  color: white;
}

.action-btn.edit:hover {
  background: #2980b9;
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
}

.bulk-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.bulk-btn.delete {
  background: #f8d7da;
  color: #721c24;
}

.bulk-btn.delete:hover:not(:disabled) {
  background: #f5c6cb;
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

.bulk-btn.unassign {
  background: #fff3cd;
  color: #856404;
}

.bulk-btn.unassign:hover:not(:disabled) {
  background: #ffeaa7;
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
}

code {
  background: #f4f4f4;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.85em;
}
</style>
