<template>
  <div class="category-form-view">
    <div class="form-header">
      <button
        data-testid="back-button"
        class="back-btn"
        @click="goBack"
      >
        &larr; {{ $t('categories.backToCategories') }}
      </button>
    </div>

    <div
      v-if="loading && isEdit"
      data-testid="loading-spinner"
      class="loading-state"
    >
      <div class="spinner" />
      <p>{{ $t('common.loading') }}</p>
    </div>

    <div
      v-else-if="fetchError"
      data-testid="error-message"
      class="error-state"
    >
      <p>{{ fetchError }}</p>
      <button
        class="retry-btn"
        @click="fetchCategory"
      >
        {{ $t('common.retry') }}
      </button>
    </div>

    <form
      v-else
      data-testid="category-form"
      class="category-form"
      @submit.prevent="handleSubmit"
    >
      <h2 data-testid="form-title">
        {{ isEdit ? $t('categories.editCategory') : $t('categories.createCategory') }}
      </h2>

      <div
        v-if="validationError"
        data-testid="validation-error"
        class="validation-error"
      >
        {{ validationError }}
      </div>

      <div
        v-if="submitError"
        data-testid="submit-error"
        class="submit-error"
      >
        {{ submitError }}
      </div>

      <div class="form-group">
        <label for="category-name">{{ $t('categories.name') }} *</label>
        <input
          id="category-name"
          v-model="formData.name"
          data-testid="category-name"
          type="text"
          class="form-input"
          @input="autoGenerateSlug"
        >
      </div>

      <div class="form-group">
        <label for="category-slug">{{ $t('categories.slug') }}</label>
        <input
          id="category-slug"
          v-model="formData.slug"
          data-testid="category-slug"
          type="text"
          class="form-input"
          :disabled="isEdit"
        >
      </div>

      <div class="form-group">
        <label for="category-description">{{ $t('categories.description') }}</label>
        <textarea
          id="category-description"
          v-model="formData.description"
          data-testid="category-description"
          rows="3"
          class="form-textarea"
        />
      </div>

      <div class="form-group">
        <label for="category-parent">{{ $t('categories.parent') }}</label>
        <select
          id="category-parent"
          v-model="formData.parent_id"
          data-testid="category-parent"
          class="form-select"
        >
          <option :value="null">
            {{ $t('categories.noParent') }}
          </option>
          <option
            v-for="cat in availableParents"
            :key="cat.id"
            :value="cat.id"
          >
            {{ cat.name }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label class="toggle-label">
          <input
            v-model="formData.is_single"
            data-testid="category-is-single"
            type="checkbox"
          >
          <span class="toggle-text">
            {{ $t('categories.isSingle') }}
          </span>
          <span class="toggle-hint">
            {{ formData.is_single ? $t('categories.isSingleHint') : $t('categories.isMultiHint') }}
          </span>
        </label>
      </div>

      <div class="form-group">
        <label for="category-sort-order">{{ $t('categories.sortOrder') }}</label>
        <input
          id="category-sort-order"
          v-model.number="formData.sort_order"
          data-testid="category-sort-order"
          type="number"
          min="0"
          class="form-input"
        >
      </div>

      <div class="form-actions">
        <div class="form-actions-left">
          <button
            v-if="isEdit && formData.slug !== 'root'"
            type="button"
            data-testid="delete-button"
            class="delete-btn"
            :disabled="deleting"
            @click="handleDelete"
          >
            {{ deleting ? $t('common.deleting') : $t('common.delete') }}
          </button>
        </div>
        <div class="form-actions-right">
          <button
            type="button"
            data-testid="cancel-button"
            class="cancel-btn"
            @click="goBack"
          >
            {{ $t('common.cancel') }}
          </button>
          <button
            type="submit"
            data-testid="submit-button"
            class="submit-btn"
            :disabled="submitting"
          >
            {{ submitting ? $t('common.saving') : (isEdit ? $t('categories.updateCategory') : $t('categories.createCategory')) }}
          </button>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useCategoryAdminStore } from '@/stores/categoryAdmin';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const categoryStore = useCategoryAdminStore();

const isEdit = computed(() => !!(route.params.id && route.params.id !== 'new'));
const categoryId = computed(() => route.params.id as string);

const loading = computed(() => categoryStore.loading);
const fetchError = ref<string | null>(null);
const validationError = ref<string | null>(null);
const submitError = ref<string | null>(null);
const submitting = ref(false);
const deleting = ref(false);
const slugManuallyEdited = ref(false);

const formData = ref({
  name: '',
  slug: '',
  description: '',
  parent_id: null as string | null,
  is_single: true,
  sort_order: 0,
});

const availableParents = computed(() => {
  return categoryStore.categories.filter(c => {
    if (isEdit.value && c.id === categoryId.value) return false;
    return true;
  });
});

function autoGenerateSlug(): void {
  if (isEdit.value || slugManuallyEdited.value) return;
  formData.value.slug = formData.value.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function fetchCategory(): Promise<void> {
  if (!isEdit.value) return;

  fetchError.value = null;
  try {
    const response = await categoryStore.fetchCategory(categoryId.value);
    if (response) {
      formData.value = {
        name: response.name || '',
        slug: response.slug || '',
        description: response.description || '',
        parent_id: response.parent_id,
        is_single: response.is_single ?? true,
        sort_order: response.sort_order ?? 0,
      };
    }
  } catch (error) {
    fetchError.value = (error as Error).message || t('categories.failedToLoad');
  }
}

function validateForm(): boolean {
  validationError.value = null;

  if (!formData.value.name.trim()) {
    validationError.value = t('categories.nameRequired');
    return false;
  }

  return true;
}

async function handleSubmit(): Promise<void> {
  if (!validateForm()) return;

  submitError.value = null;
  submitting.value = true;

  try {
    if (isEdit.value) {
      await categoryStore.updateCategory(categoryId.value, formData.value);
    } else {
      await categoryStore.createCategory(formData.value);
    }
    router.push('/admin/plans');
  } catch (error) {
    submitError.value = (error as Error).message || t('categories.failedToSave');
  } finally {
    submitting.value = false;
  }
}

async function handleDelete(): Promise<void> {
  if (!isEdit.value) return;
  if (!confirm(t('categories.confirmDelete'))) return;

  deleting.value = true;
  try {
    await categoryStore.deleteCategory(categoryId.value);
    router.push('/admin/plans');
  } catch (error) {
    submitError.value = (error as Error).message || t('categories.failedToDelete');
  } finally {
    deleting.value = false;
  }
}

function goBack(): void {
  router.push('/admin/plans');
}

onMounted(async () => {
  // Load all categories for parent dropdown
  try {
    await categoryStore.fetchCategories('flat');
  } catch {
    // Non-critical
  }

  if (isEdit.value) {
    await fetchCategory();
  }
});
</script>

<style scoped>
.category-form-view {
  background: white;
  padding: 20px;
  border-radius: 8px;
}

.form-header {
  margin-bottom: 20px;
}

.back-btn {
  background: none;
  border: none;
  color: #3498db;
  cursor: pointer;
  font-size: 14px;
  padding: 0;
}

.back-btn:hover {
  text-decoration: underline;
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

.retry-btn {
  margin-top: 15px;
  padding: 10px 20px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.category-form h2 {
  margin: 0 0 25px 0;
  color: #2c3e50;
}

.validation-error,
.submit-error {
  background: #f8d7da;
  color: #721c24;
  padding: 12px 15px;
  border-radius: 4px;
  margin-bottom: 20px;
  font-size: 14px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #2c3e50;
  font-size: 14px;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  border-color: #3498db;
  outline: none;
}

.form-input:disabled {
  background: #f5f5f5;
  color: #999;
}

.form-textarea {
  resize: vertical;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.toggle-text {
  font-weight: 500;
}

.toggle-hint {
  color: #666;
  font-size: 0.85em;
  font-weight: normal;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: space-between;
  align-items: center;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.form-actions-left {
  display: flex;
  gap: 12px;
}

.form-actions-right {
  display: flex;
  gap: 12px;
}

.cancel-btn {
  padding: 10px 20px;
  background: #e9ecef;
  color: #495057;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.cancel-btn:hover {
  background: #dee2e6;
}

.submit-btn {
  padding: 10px 20px;
  background: #27ae60;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.submit-btn:hover:not(:disabled) {
  background: #1e8449;
}

.submit-btn:disabled {
  background: #95a5a6;
  cursor: not-allowed;
}

.delete-btn {
  padding: 10px 20px;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.delete-btn:hover:not(:disabled) {
  background: #c0392b;
}

.delete-btn:disabled {
  background: #95a5a6;
  cursor: not-allowed;
}
</style>
