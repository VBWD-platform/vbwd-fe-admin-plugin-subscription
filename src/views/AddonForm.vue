<template>
  <div class="addon-form-view">
    <div class="form-header">
      <button
        data-testid="back-button"
        class="back-btn"
        @click="goBack"
      >
        &larr; {{ $t('addOns.backToAddons') }}
      </button>
    </div>

    <div
      v-if="loading && isEdit"
      data-testid="loading-spinner"
      class="loading-state"
    >
      <div class="spinner" />
      <p>{{ $t('addOns.loadingAddon') }}</p>
    </div>

    <div
      v-else-if="fetchError"
      data-testid="error-message"
      class="error-state"
    >
      <p>{{ fetchError }}</p>
      <button
        class="retry-btn"
        @click="fetchAddon"
      >
        {{ $t('common.retry') }}
      </button>
    </div>

    <form
      v-else
      data-testid="addon-form"
      class="addon-form"
      @submit.prevent="handleSubmit"
    >
      <h2 data-testid="form-title">
        {{ isEdit ? $t('addOns.editAddon') : $t('addOns.createAddon') }}
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
        <label for="addon-name">{{ $t('addOns.name') }} *</label>
        <input
          id="addon-name"
          v-model="formData.name"
          data-testid="addon-name"
          type="text"
          :placeholder="$t('addOns.enterName')"
          class="form-input"
        >
      </div>

      <div class="form-group">
        <label for="addon-slug">{{ $t('addOns.slug') }}</label>
        <input
          id="addon-slug"
          v-model="formData.slug"
          data-testid="addon-slug"
          type="text"
          :placeholder="$t('addOns.slugHint')"
          class="form-input"
        >
        <small class="form-hint">{{ $t('addOns.slugHint') }}</small>
      </div>

      <div class="form-group">
        <label for="addon-description">{{ $t('addOns.description') }}</label>
        <textarea
          id="addon-description"
          v-model="formData.description"
          data-testid="addon-description"
          rows="3"
          :placeholder="$t('addOns.enterDescription')"
          class="form-textarea"
        />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="addon-price">{{ $t('addOns.price') }} *</label>
          <input
            id="addon-price"
            v-model.number="formData.price"
            data-testid="addon-price"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            class="form-input"
          >
        </div>

        <div class="form-group">
          <label for="addon-currency">{{ $t('addOns.currency') }}</label>
          <select
            id="addon-currency"
            v-model="formData.currency"
            data-testid="addon-currency"
            class="form-select"
          >
            <option value="EUR">
              EUR
            </option>
            <option value="USD">
              USD
            </option>
            <option value="GBP">
              GBP
            </option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label for="addon-billing">{{ $t('addOns.billingPeriod') }} *</label>
        <select
          id="addon-billing"
          v-model="formData.billing_period"
          data-testid="addon-billing"
          class="form-select"
        >
          <option value="">
            -- {{ $t('addOns.billingPeriod') }} --
          </option>
          <option value="MONTHLY">
            {{ $t('addOns.monthly') }}
          </option>
          <option value="YEARLY">
            {{ $t('addOns.yearly') }}
          </option>
          <option value="ONE_TIME">
            {{ $t('addOns.oneTime') }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label>{{ $t('addOns.restrictToPlans') }}</label>
        <small class="form-hint plan-hint">{{ $t('addOns.restrictToPlansHint') }}</small>
        <div
          v-if="plansLoading"
          class="plans-loading"
        >
          {{ $t('common.loading') }}
        </div>
        <div
          v-else-if="availablePlans.length === 0"
          class="plans-empty"
        >
          {{ $t('addOns.noPlansAvailable') }}
        </div>
        <div
          v-else
          data-testid="plan-checkboxes"
          class="plan-checkboxes"
        >
          <label
            v-for="plan in availablePlans"
            :key="plan.id"
            class="plan-checkbox-label"
          >
            <input
              type="checkbox"
              :value="plan.id"
              :checked="formData.tarif_plan_ids.includes(plan.id)"
              :data-testid="`plan-checkbox-${plan.id}`"
              @change="togglePlan(plan.id)"
            >
            {{ plan.name }}
          </label>
        </div>
      </div>

      <div class="form-group">
        <label for="addon-config">{{ $t('addOns.config') }}</label>
        <textarea
          id="addon-config"
          v-model="configText"
          data-testid="addon-config"
          rows="4"
          :placeholder="$t('addOns.enterConfig')"
          class="form-textarea mono"
        />
        <small class="form-hint">{{ $t('addOns.configHint') }}</small>
      </div>

      <div class="form-group">
        <label for="addon-sort-order">{{ $t('addOns.sortOrder') }}</label>
        <input
          id="addon-sort-order"
          v-model.number="formData.sort_order"
          data-testid="addon-sort-order"
          type="number"
          min="0"
          placeholder="0"
          class="form-input"
        >
      </div>

      <div class="form-actions">
        <div class="form-actions-left">
          <button
            v-if="canManage && isEdit && addonIsActive"
            type="button"
            data-testid="deactivate-button"
            class="deactivate-btn"
            :disabled="toggling"
            @click="handleDeactivate"
          >
            {{ $t('addOns.deactivateAddon') }}
          </button>
          <button
            v-if="canManage && isEdit && !addonIsActive"
            type="button"
            data-testid="activate-button"
            class="activate-btn"
            :disabled="toggling"
            @click="handleActivate"
          >
            {{ $t('addOns.activateAddon') }}
          </button>
          <button
            v-if="canManage && isEdit"
            type="button"
            data-testid="delete-button"
            class="delete-btn"
            :disabled="deleting"
            @click="handleDelete"
          >
            {{ $t('addOns.deleteAddon') }}
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
            {{ submitting ? $t('common.saving') : (isEdit ? $t('addOns.updateAddon') : $t('addOns.createAddon')) }}
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
import { useAuthStore } from '@/stores/auth';
import { useAddonStore } from '../stores/addons';
import { usePlanAdminStore } from '../stores/planAdmin';
import type { AdminPlan } from '../stores/planAdmin';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const addonStore = useAddonStore();
const planStore = usePlanAdminStore();

const canManage = computed(() => authStore.hasPermission('subscription.addons.manage'));

const isEdit = computed(() => route.params.id && route.params.id !== 'new');
const addonId = computed(() => route.params.id as string);

const loading = computed(() => addonStore.loading);
const fetchError = ref<string | null>(null);
const validationError = ref<string | null>(null);
const submitError = ref<string | null>(null);
const submitting = ref(false);
const toggling = ref(false);
const deleting = ref(false);
const addonIsActive = ref(true);
const plansLoading = ref(false);
const availablePlans = ref<AdminPlan[]>([]);

const formData = ref({
  name: '',
  slug: '',
  description: '',
  price: 0,
  currency: 'EUR',
  billing_period: '' as string,
  config: {} as Record<string, unknown>,
  sort_order: 0,
  tarif_plan_ids: [] as string[]
});

function togglePlan(planId: string): void {
  const idx = formData.value.tarif_plan_ids.indexOf(planId);
  if (idx >= 0) {
    formData.value.tarif_plan_ids.splice(idx, 1);
  } else {
    formData.value.tarif_plan_ids.push(planId);
  }
}

const configText = computed({
  get: () => {
    const config = formData.value.config;
    if (!config || Object.keys(config).length === 0) return '';
    return JSON.stringify(config, null, 2);
  },
  set: (value: string) => {
    if (!value.trim()) {
      formData.value.config = {};
      return;
    }
    try {
      formData.value.config = JSON.parse(value);
    } catch {
      // Keep the text as-is, validation will catch invalid JSON on submit
    }
  }
});

async function fetchAddon(): Promise<void> {
  if (!isEdit.value) return;

  fetchError.value = null;
  try {
    const response = await addonStore.fetchAddon(addonId.value);
    if (response) {
      formData.value = {
        name: response.name || '',
        slug: response.slug || '',
        description: response.description || '',
        price: typeof response.price === 'string' ? parseFloat(response.price) : (response.price || 0),
        currency: response.currency || 'EUR',
        billing_period: response.billing_period || '',
        config: response.config || {},
        sort_order: response.sort_order || 0,
        tarif_plan_ids: response.tarif_plan_ids || []
      };
      addonIsActive.value = response.is_active !== false;
    }
  } catch (error) {
    fetchError.value = (error as Error).message || t('addOns.failedToLoadAddon');
  }
}

function validateForm(): boolean {
  validationError.value = null;

  if (!formData.value.name.trim()) {
    validationError.value = t('addOns.nameRequired');
    return false;
  }

  if (formData.value.price < 0 || formData.value.price === null || formData.value.price === undefined) {
    validationError.value = t('addOns.priceInvalid');
    return false;
  }

  if (!formData.value.billing_period) {
    validationError.value = t('addOns.billingPeriodRequired');
    return false;
  }

  return true;
}

async function handleSubmit(): Promise<void> {
  if (!validateForm()) return;

  submitError.value = null;
  submitting.value = true;

  try {
    const data = {
      name: formData.value.name,
      price: formData.value.price,
      currency: formData.value.currency,
      billing_period: formData.value.billing_period,
      sort_order: formData.value.sort_order,
      tarif_plan_ids: formData.value.tarif_plan_ids,
      ...(formData.value.slug ? { slug: formData.value.slug } : {}),
      ...(formData.value.description ? { description: formData.value.description } : {}),
      ...(Object.keys(formData.value.config).length > 0 ? { config: formData.value.config } : {})
    };

    if (isEdit.value) {
      await addonStore.updateAddon(addonId.value, data);
    } else {
      await addonStore.createAddon(data);
    }

    router.push('/admin/add-ons');
  } catch (error) {
    submitError.value = (error as Error).message || t('addOns.failedToSaveAddon');
  } finally {
    submitting.value = false;
  }
}

function goBack(): void {
  router.push('/admin/add-ons');
}

async function handleActivate(): Promise<void> {
  if (!isEdit.value) return;

  toggling.value = true;
  try {
    await addonStore.activateAddon(addonId.value);
    addonIsActive.value = true;
  } catch (error) {
    submitError.value = (error as Error).message || t('addOns.failedToSaveAddon');
  } finally {
    toggling.value = false;
  }
}

async function handleDeactivate(): Promise<void> {
  if (!isEdit.value) return;

  toggling.value = true;
  try {
    await addonStore.deactivateAddon(addonId.value);
    addonIsActive.value = false;
  } catch (error) {
    submitError.value = (error as Error).message || t('addOns.failedToSaveAddon');
  } finally {
    toggling.value = false;
  }
}

async function handleDelete(): Promise<void> {
  if (!confirm(t('addOns.confirmDelete'))) return;

  deleting.value = true;
  try {
    await addonStore.deleteAddon(addonId.value);
    router.push('/admin/add-ons');
  } catch (error) {
    submitError.value = (error as Error).message || t('addOns.failedToDeleteAddon');
  } finally {
    deleting.value = false;
  }
}

async function fetchPlans(): Promise<void> {
  plansLoading.value = true;
  try {
    const plans = await planStore.fetchPlans();
    availablePlans.value = plans.filter((p: AdminPlan) => p.is_active);
  } catch {
    // Plans loading failure is non-critical
  } finally {
    plansLoading.value = false;
  }
}

onMounted(() => {
  fetchPlans();
  if (isEdit.value) {
    fetchAddon();
  }
});
</script>

<style scoped>
.addon-form-view {
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

.addon-form h2 {
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

.form-row {
  display: flex;
  gap: 20px;
}

.form-row .form-group {
  flex: 1;
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

.form-textarea.mono {
  font-family: monospace;
  font-size: 13px;
}

.form-hint {
  display: block;
  margin-top: 4px;
  color: #999;
  font-size: 12px;
}

.plan-hint {
  margin-bottom: 8px;
}

.plan-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding: 10px;
  border: 1px solid #eee;
  border-radius: 4px;
  background: #fafafa;
}

.plan-checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #2c3e50;
  cursor: pointer;
}

.plans-loading,
.plans-empty {
  padding: 10px;
  color: #999;
  font-size: 13px;
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

.activate-btn {
  padding: 10px 20px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.activate-btn:hover:not(:disabled) {
  background: #218838;
}

.activate-btn:disabled {
  background: #95a5a6;
  cursor: not-allowed;
}

.deactivate-btn {
  padding: 10px 20px;
  background: #ffc107;
  color: #212529;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.deactivate-btn:hover:not(:disabled) {
  background: #e0a800;
}

.deactivate-btn:disabled {
  background: #95a5a6;
  cursor: not-allowed;
}

.delete-btn {
  padding: 10px 20px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.delete-btn:hover:not(:disabled) {
  background: #c82333;
}

.delete-btn:disabled {
  background: #95a5a6;
  cursor: not-allowed;
}
</style>
