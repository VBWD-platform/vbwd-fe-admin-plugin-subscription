<template>
  <div class="plan-form-view">
    <div class="form-header">
      <button
        data-testid="back-button"
        class="back-btn"
        @click="goBack"
      >
        &larr; {{ $t('plans.backToPlans') }}
      </button>
    </div>

    <div
      v-if="loading && isEdit"
      data-testid="loading-spinner"
      class="loading-state"
    >
      <div class="spinner" />
      <p>{{ $t('plans.loadingPlan') }}</p>
    </div>

    <div
      v-else-if="fetchError"
      data-testid="error-message"
      class="error-state"
    >
      <p>{{ fetchError }}</p>
      <button
        class="retry-btn"
        @click="fetchPlan"
      >
        {{ $t('common.retry') }}
      </button>
    </div>

    <template v-else>
      <h2 data-testid="form-title">
        {{ isEdit ? $t('plans.editPlan') : $t('plans.createPlan') }}
      </h2>

      <!-- Tab bar: Details + plugin tabs -->
      <div class="pf-tabs">
        <div class="pf-tabs__bar">
          <button
            type="button"
            class="pf-tabs__tab"
            :class="{ 'pf-tabs__tab--active': activeTab === 'details' }"
            data-testid="tab-details"
            @click="activeTab = 'details'"
          >
            {{ $t('plans.planDetails') }}
          </button>
          <button
            v-for="tab in visiblePlanTabs"
            :key="tab.label"
            type="button"
            class="pf-tabs__tab"
            :class="{ 'pf-tabs__tab--active': activeTab === tab.label }"
            :data-testid="`tab-${tab.label.toLowerCase()}`"
            @click="activeTab = tab.label"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- Details tab -->
        <div
          v-show="activeTab === 'details'"
          class="pf-tabs__panel"
        >
          <form
            data-testid="plan-form"
            @submit.prevent="handleSubmit"
          >
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
              <label for="plan-name">{{ $t('plans.name') }} *</label>
              <input
                id="plan-name"
                v-model="formData.name"
                data-testid="plan-name"
                type="text"
                :placeholder="$t('plans.enterPlanName')"
                class="form-input"
              >
            </div>

            <div class="form-group">
              <label for="plan-price">{{ $t('plans.price') }} *</label>
              <input
                id="plan-price"
                v-model.number="formData.price"
                data-testid="plan-price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                class="form-input"
              >
            </div>

            <div class="form-group">
              <label for="plan-billing">{{ $t('plans.billingPeriod') }} *</label>
              <select
                id="plan-billing"
                v-model="formData.billing_period"
                data-testid="plan-billing"
                class="form-select"
              >
                <option value="">
                  {{ $t('plans.selectBillingPeriod') }}
                </option>
                <option value="MONTHLY">
                  {{ $t('plans.monthly') }}
                </option>
                <option value="YEARLY">
                  {{ $t('plans.yearly') }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="plan-trial-days">{{ $t('plans.trialDays') }}</label>
              <input
                id="plan-trial-days"
                v-model.number="formData.trial_days"
                data-testid="plan-trial-days"
                type="number"
                min="0"
                placeholder="0"
                class="form-input"
              >
            </div>

            <div class="form-group">
              <label for="plan-features">{{ $t('plans.featuresOnePerLine') }}</label>
              <textarea
                id="plan-features"
                v-model="featuresText"
                data-testid="plan-features"
                rows="4"
                :placeholder="$t('plans.enterFeatures')"
                class="form-textarea"
              />
            </div>

            <!-- Categories (edit mode only) -->
            <div
              v-if="isEdit"
              class="categories-section"
              data-testid="categories-section"
            >
              <h3>{{ $t('categories.categoriesTab') }}</h3>
              <div class="categories-panels">
                <div class="category-panel">
                  <h4>{{ $t('categories.available') }}</h4>
                  <div class="category-list">
                    <div
                      v-for="cat in availableCategories"
                      :key="cat.id"
                      class="category-item"
                      :data-testid="`available-category-${cat.id}`"
                    >
                      <span>{{ cat.name }}</span>
                      <span
                        class="type-badge"
                        :class="cat.is_single ? 'single' : 'multi'"
                      >
                        {{ cat.is_single ? 'Single' : 'Multi' }}
                      </span>
                      <button
                        type="button"
                        class="assign-btn"
                        @click="assignCategory(cat.id)"
                      >
                        +
                      </button>
                    </div>
                    <p
                      v-if="availableCategories.length === 0"
                      class="empty-hint"
                    >
                      {{ $t('categories.allAssigned') }}
                    </p>
                  </div>
                </div>
                <div class="category-panel">
                  <h4>{{ $t('categories.assigned') }}</h4>
                  <div class="category-list">
                    <div
                      v-for="cat in assignedCategories"
                      :key="cat.id"
                      class="category-item"
                      :data-testid="`assigned-category-${cat.id}`"
                    >
                      <span>{{ cat.name }}</span>
                      <span
                        class="type-badge"
                        :class="cat.is_single ? 'single' : 'multi'"
                      >
                        {{ cat.is_single ? 'Single' : 'Multi' }}
                      </span>
                      <button
                        type="button"
                        class="unassign-btn"
                        @click="unassignCategory(cat.id)"
                      >
                        &times;
                      </button>
                    </div>
                    <p
                      v-if="assignedCategories.length === 0"
                      class="empty-hint"
                    >
                      {{ $t('categories.noneAssigned') }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-actions">
              <div class="form-actions-left">
                <button
                  v-if="canManage && isEdit && planIsActive"
                  type="button"
                  data-testid="archive-button"
                  class="archive-btn"
                  :disabled="archiving"
                  @click="handleArchive"
                >
                  {{ archiving ? $t('plans.archiving') : $t('plans.archivePlan') }}
                </button>
                <button
                  v-if="canManage && isEdit && !planIsActive"
                  type="button"
                  data-testid="reactivate-button"
                  class="reactivate-btn"
                  :disabled="reactivating"
                  @click="handleReactivate"
                >
                  {{ reactivating ? $t('plans.reactivating') : $t('plans.reactivatePlan') }}
                </button>
                <button
                  v-if="canManage && isEdit"
                  type="button"
                  data-testid="copy-button"
                  class="copy-btn"
                  :disabled="copying"
                  @click="handleCopy"
                >
                  {{ copying ? $t('plans.copying') : $t('plans.copyPlan') }}
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
                  v-if="canManage"
                  type="button"
                  data-testid="submit-button"
                  class="submit-btn"
                  :disabled="submitting"
                  @click="handleSubmit"
                >
                  {{ submitting ? $t('common.saving') : (isEdit ? $t('plans.updatePlan') : $t('plans.createPlan')) }}
                </button>
              </div>
            </div>
          </form>
        </div>

        <!-- Plugin tabs -->
        <div
          v-for="tab in visiblePlanTabs"
          v-show="activeTab === tab.label"
          :key="tab.label + '-panel'"
          class="pf-tabs__panel"
        >
          <component
            :is="tab.component"
            :plan-id="planId"
            :assigned-categories="assignedCategories"
          />
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
import { usePlanAdminStore } from '@/stores/planAdmin';
import { useCategoryAdminStore, type AdminCategory } from '@/stores/categoryAdmin';
import { extensionRegistry } from '@/plugins/extensionRegistry';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const planStore = usePlanAdminStore();
const categoryStore = useCategoryAdminStore();

const canManage = computed(() => authStore.hasPermission('subscription.plans.manage'));

const isEdit = computed(() => route.params.id && route.params.id !== 'new');
const planId = computed(() => route.params.id as string);

const loading = computed(() => planStore.loading);
const fetchError = ref<string | null>(null);
const validationError = ref<string | null>(null);
const submitError = ref<string | null>(null);
const submitting = ref(false);
const archiving = ref(false);
const reactivating = ref(false);
const copying = ref(false);
const planIsActive = ref(true);
const planCategoryIds = ref<string[]>([]);
const allCategories = ref<AdminCategory[]>([]);
const activeTab = ref<string>('details');

const formData = ref({
  name: '',
  price: 0,
  billing_period: '' as string,
  trial_days: 0,
  features: [] as string[] | Record<string, unknown>
});

const featuresText = computed({
  get: () => {
    const features = formData.value.features;
    if (Array.isArray(features)) {
      return features.join('\n');
    } else if (features && typeof features === 'object') {
      return Object.entries(features)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
    }
    return '';
  },
  set: (value: string) => {
    const lines = value.split('\n').filter(f => f.trim());
    const hasKeyValue = lines.some(line => line.includes(':'));
    if (hasKeyValue) {
      const obj: Record<string, string | number | boolean> = {};
      lines.forEach(line => {
        const [key, ...rest] = line.split(':');
        if (key && rest.length) {
          const val = rest.join(':').trim();
          if (val === 'true') obj[key.trim()] = true;
          else if (val === 'false') obj[key.trim()] = false;
          else if (!isNaN(Number(val))) obj[key.trim()] = Number(val);
          else obj[key.trim()] = val;
        }
      });
      formData.value.features = obj as unknown as string[];
    } else {
      formData.value.features = lines;
    }
  }
});

async function fetchPlan(): Promise<void> {
  if (!isEdit.value) return;

  fetchError.value = null;
  try {
    const response = await planStore.fetchPlan(planId.value);
    if (response) {
      let priceValue = 0;
      if (typeof response.price_float === 'number') {
        priceValue = response.price_float;
      } else if (typeof response.price === 'number') {
        priceValue = response.price;
      } else if (response.price && typeof response.price === 'object' && 'price_float' in response.price) {
        priceValue = (response.price as { price_float: number }).price_float;
      }

      formData.value = {
        name: response.name || '',
        price: priceValue,
        billing_period: response.billing_period || '',
        trial_days: response.trial_days || 0,
        features: response.features || []
      };
      planIsActive.value = response.is_active !== false;
    }
  } catch (error) {
    fetchError.value = (error as Error).message || t('plans.failedToLoadPlan');
  }
}

function validateForm(): boolean {
  validationError.value = null;

  if (!formData.value.name.trim()) {
    validationError.value = t('plans.nameRequired');
    return false;
  }

  if (formData.value.price < 0) {
    validationError.value = t('plans.priceInvalid');
    return false;
  }

  if (!formData.value.billing_period) {
    validationError.value = t('plans.billingPeriodRequired');
    return false;
  }

  return true;
}

async function handleSubmit(): Promise<void> {
  if (!validateForm()) return;

  submitError.value = null;
  submitting.value = true;

  try {
    const billingPeriod = formData.value.billing_period.toUpperCase() as 'MONTHLY' | 'YEARLY';
    const data = {
      name: formData.value.name,
      price: formData.value.price,
      billing_period: billingPeriod,
      trial_days: formData.value.trial_days || 0,
      features: formData.value.features
    };

    if (isEdit.value) {
      await planStore.updatePlan(planId.value, data);
    } else {
      await planStore.createPlan(data);
    }

    router.push('/admin/plans');
  } catch (error) {
    submitError.value = (error as Error).message || t('plans.failedToSavePlan');
  } finally {
    submitting.value = false;
  }
}

function goBack(): void {
  router.push('/admin/plans');
}

async function handleArchive(): Promise<void> {
  if (!isEdit.value) return;

  archiving.value = true;
  try {
    await planStore.archivePlan(planId.value);
    router.push('/admin/plans');
  } catch (error) {
    submitError.value = (error as Error).message || t('plans.failedToArchivePlan');
  } finally {
    archiving.value = false;
  }
}

async function handleReactivate(): Promise<void> {
  if (!isEdit.value) return;

  reactivating.value = true;
  try {
    await planStore.activatePlan(planId.value);
    planIsActive.value = true;
  } catch (error) {
    submitError.value = (error as Error).message || t('plans.failedToReactivatePlan');
  } finally {
    reactivating.value = false;
  }
}

async function handleCopy(): Promise<void> {
  if (!isEdit.value) return;

  copying.value = true;
  try {
    const newPlan = await planStore.copyPlan(planId.value);
    router.push(`/admin/plans/${newPlan.id}/edit`);
  } catch (error) {
    submitError.value = (error as Error).message || t('plans.failedToCopyPlan');
  } finally {
    copying.value = false;
  }
}

const availableCategories = computed(() => {
  return allCategories.value.filter(c => !planCategoryIds.value.includes(c.id));
});

const assignedCategories = computed(() => {
  return allCategories.value.filter(c => planCategoryIds.value.includes(c.id));
});

const visiblePlanTabs = computed(() => {
  const assignedSlugs = assignedCategories.value.map(c => c.slug);
  return extensionRegistry.getPlanTabSections().filter(tab => {
    if (!tab.requiredCategorySlugs || tab.requiredCategorySlugs.length === 0) return true;
    return tab.requiredCategorySlugs.some(s => assignedSlugs.includes(s));
  });
});

async function assignCategory(categoryId: string): Promise<void> {
  try {
    await categoryStore.attachPlans(categoryId, [planId.value]);
    planCategoryIds.value.push(categoryId);
  } catch (error) {
    submitError.value = (error as Error).message || 'Failed to assign category';
  }
}

async function unassignCategory(categoryId: string): Promise<void> {
  try {
    await categoryStore.detachPlans(categoryId, [planId.value]);
    planCategoryIds.value = planCategoryIds.value.filter(id => id !== categoryId);
  } catch (error) {
    submitError.value = (error as Error).message || 'Failed to unassign category';
  }
}

onMounted(async () => {
  if (isEdit.value) {
    await fetchPlan();

    try {
      const cats = await categoryStore.fetchCategories('flat');
      allCategories.value = cats || [];

      const plan = planStore.selectedPlan;
      if (plan && (plan as any).categories) {
        planCategoryIds.value = ((plan as any).categories as { id: string }[]).map(c => c.id);
      }
    } catch {
      // Non-critical
    }
  }
});
</script>

<style scoped>
.plan-form-view {
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

.plan-form-view h2 {
  margin: 0 0 20px 0;
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

/* ── Tabs ─────────────────────────────────────────────── */

.pf-tabs {
  border: 1px solid #e9ecef;
  border-radius: 6px;
  overflow: hidden;
}

.pf-tabs__bar {
  display: flex;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.pf-tabs__tab {
  padding: 10px 24px;
  background: none;
  border: none;
  border-right: 1px solid #e9ecef;
  cursor: pointer;
  font-size: 14px;
  color: #555;
  transition: background 0.15s;
  white-space: nowrap;
}

.pf-tabs__tab:hover {
  background: #e9ecef;
}

.pf-tabs__tab--active {
  background: #fff;
  color: #2c3e50;
  font-weight: 600;
  border-bottom: 2px solid #3498db;
  margin-bottom: -1px;
}

.pf-tabs__panel {
  padding: 24px;
  background: #fff;
}

/* ── Form fields ──────────────────────────────────────── */

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

.form-textarea {
  resize: vertical;
}

/* ── Categories ───────────────────────────────────────── */

.categories-section {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.categories-section h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
}

.categories-panels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.category-panel h4 {
  margin: 0 0 10px 0;
  color: #555;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.category-list {
  border: 1px solid #e9ecef;
  border-radius: 4px;
  min-height: 100px;
  max-height: 250px;
  overflow-y: auto;
  padding: 8px;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.category-item:hover {
  background: #f8f9fa;
}

.category-item span:first-child {
  flex: 1;
}

.type-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.75rem;
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

.assign-btn,
.unassign-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.assign-btn {
  background: #d4edda;
  color: #155724;
}

.assign-btn:hover {
  background: #c3e6cb;
}

.unassign-btn {
  background: #f8d7da;
  color: #721c24;
}

.unassign-btn:hover {
  background: #f5c6cb;
}

.empty-hint {
  text-align: center;
  color: #999;
  font-size: 13px;
  padding: 20px 0;
}

/* ── Form actions ─────────────────────────────────────── */

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: space-between;
  align-items: center;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.form-actions-left,
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

.archive-btn {
  padding: 10px 20px;
  background: #ffc107;
  color: #212529;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.archive-btn:hover:not(:disabled) {
  background: #e0a800;
}

.archive-btn:disabled,
.reactivate-btn:disabled,
.copy-btn:disabled {
  background: #95a5a6;
  cursor: not-allowed;
}

.reactivate-btn {
  padding: 10px 20px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.reactivate-btn:hover:not(:disabled) {
  background: #218838;
}

.copy-btn {
  padding: 10px 20px;
  background: #17a2b8;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.copy-btn:hover:not(:disabled) {
  background: #138496;
}
</style>
