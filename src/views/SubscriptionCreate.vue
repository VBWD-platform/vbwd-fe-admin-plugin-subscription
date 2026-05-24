<template>
  <div
    class="subscription-create-view"
    data-testid="subscription-create-view"
  >
    <div class="form-header">
      <button
        data-testid="back-button"
        class="back-btn"
        @click="goBack"
      >
        &larr; {{ $t('subscriptions.backToSubscriptions') }}
      </button>
    </div>

    <form
      data-testid="subscription-form"
      class="subscription-form"
      @submit.prevent="handleSubmit"
    >
      <h2 data-testid="form-title">
        {{ $t('subscriptions.createSubscription') }}
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

      <!-- User Selection -->
      <section class="form-section">
        <h3>{{ $t('subscriptions.user') }}</h3>

        <div class="form-group">
          <label for="userSearch">{{ $t('subscriptions.searchUserByEmail') }} *</label>
          <div class="search-container">
            <input
              id="userSearch"
              v-model="userSearch"
              type="text"
              :placeholder="$t('subscriptions.enterEmailToSearch')"
              class="form-input"
              @input="handleUserSearch"
            >
            <div
              v-if="searchingUsers"
              class="search-status"
            >
              {{ $t('common.searching') }}
            </div>
          </div>
          <div
            v-if="searchResults.length > 0"
            class="search-results"
          >
            <div
              v-for="user in searchResults"
              :key="user.id"
              class="search-result-item"
              @click="selectUser(user)"
            >
              <span class="result-email">{{ user.email }}</span>
              <span class="result-name">{{ user.name }}</span>
            </div>
          </div>
        </div>

        <div
          v-if="selectedUser"
          class="selected-user"
        >
          <label>{{ $t('subscriptions.selectedUser') }}</label>
          <div class="user-card">
            <span class="user-email">{{ selectedUser.email }}</span>
            <span class="user-name">{{ selectedUser.name || $t('users.noName') }}</span>
            <button
              type="button"
              class="clear-btn"
              @click="clearUser"
            >
              {{ $t('subscriptions.clear') }}
            </button>
          </div>
        </div>
      </section>

      <!-- Plan Selection -->
      <section class="form-section">
        <h3>{{ $t('subscriptions.plan') }}</h3>

        <div
          v-if="loadingPlans"
          class="loading-plans"
        >
          {{ $t('plans.loading') }}
        </div>

        <div
          v-else
          class="form-group"
        >
          <label for="planId">{{ $t('subscriptions.selectPlan') }} *</label>
          <select
            id="planId"
            v-model="formData.plan_id"
            name="planId"
            class="form-select"
            required
          >
            <option value="">
              -- {{ $t('subscriptions.selectAPlan') }} --
            </option>
            <option
              v-for="plan in activePlans"
              :key="plan.id"
              :value="plan.id"
            >
              {{ plan.name }} - {{ formatPrice(plan) }}/{{ plan.billing_period }}
            </option>
          </select>
        </div>
      </section>

      <!-- Subscription Options -->
      <section class="form-section">
        <h3>{{ $t('subscriptions.options') }}</h3>

        <div class="form-row">
          <div class="form-group">
            <label for="status">{{ $t('subscriptions.initialStatus') }}</label>
            <select
              id="status"
              v-model="formData.status"
              name="status"
              class="form-select"
            >
              <option value="ACTIVE">
                {{ $t('subscriptions.statuses.active') }}
              </option>
              <option value="TRIALING">
                {{ $t('subscriptions.statuses.trialing') }}
              </option>
            </select>
          </div>
        </div>
      </section>

      <!-- Form Actions -->
      <div class="form-actions">
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
          type="submit"
          data-testid="submit-button"
          class="submit-btn"
          :disabled="submitting || !isFormValid"
        >
          {{ submitting ? $t('subscriptions.creating') : $t('subscriptions.createSubscription') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import { useSubscriptionsStore, type CreateSubscriptionData } from '../stores/subscriptions';
import { usePlanAdminStore, type AdminPlan } from '../stores/planAdmin';
import { useUsersStore, type User } from '@/stores/users';

const router = useRouter();
const { t } = useI18n();
const authStore = useAuthStore();
const subscriptionsStore = useSubscriptionsStore();
const plansStore = usePlanAdminStore();
const usersStore = useUsersStore();

const canManage = computed(() => authStore.hasPermission('subscription.subscriptions.manage'));

const validationError = ref<string | null>(null);
const submitError = ref<string | null>(null);
const submitting = ref(false);
const loadingPlans = ref(true);

// User search
const userSearch = ref('');
const searchingUsers = ref(false);
const searchResults = ref<User[]>([]);
const selectedUser = ref<User | null>(null);
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

// Form data
const formData = ref({
  plan_id: '',
  status: 'ACTIVE',
});

const activePlans = computed(() =>
  plansStore.plans.filter(plan => plan.is_active)
);

const isFormValid = computed(() =>
  selectedUser.value !== null && formData.value.plan_id !== ''
);

async function loadPlans(): Promise<void> {
  loadingPlans.value = true;
  try {
    await plansStore.fetchPlans();
  } catch {
    // Error handled by store
  } finally {
    loadingPlans.value = false;
  }
}

function handleUserSearch(): void {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  if (userSearch.value.length < 2) {
    searchResults.value = [];
    return;
  }

  searchTimeout = setTimeout(async () => {
    searchingUsers.value = true;
    try {
      await usersStore.fetchUsers({
        page: 1,
        per_page: 5,
        search: userSearch.value,
      });
      searchResults.value = usersStore.users;
    } catch {
      searchResults.value = [];
    } finally {
      searchingUsers.value = false;
    }
  }, 300);
}

function selectUser(user: User): void {
  selectedUser.value = user;
  userSearch.value = '';
  searchResults.value = [];
}

function clearUser(): void {
  selectedUser.value = null;
}

function formatPrice(plan: AdminPlan): string {
  if (!plan.price) return t('plans.free');
  if (typeof plan.price === 'number') {
    return `$${plan.price.toFixed(2)}`;
  }
  if (plan.price.price_float !== undefined) {
    const symbol = plan.price.currency_symbol || '$';
    return `${symbol}${plan.price.price_float.toFixed(2)}`;
  }
  return plan.price.price_decimal || t('plans.free');
}

function validateForm(): boolean {
  validationError.value = null;

  if (!selectedUser.value) {
    validationError.value = t('subscriptions.validation.selectUser');
    return false;
  }

  if (!formData.value.plan_id) {
    validationError.value = t('subscriptions.validation.selectPlan');
    return false;
  }

  return true;
}

async function handleSubmit(): Promise<void> {
  if (!validateForm()) return;

  submitError.value = null;
  submitting.value = true;

  try {
    const data: CreateSubscriptionData = {
      user_id: selectedUser.value!.id,
      plan_id: formData.value.plan_id,
      status: formData.value.status.toLowerCase(),
    };

    const subscription = await subscriptionsStore.createSubscription(data);
    router.push(`/admin/subscriptions/${subscription.id}`);
  } catch (error) {
    submitError.value = (error as Error).message || t('subscriptions.createFailed');
  } finally {
    submitting.value = false;
  }
}

function goBack(): void {
  router.push('/admin/subscriptions');
}

onMounted(() => {
  loadPlans();
});
</script>

<style scoped>
.subscription-create-view {
  background: white;
  padding: 20px;
  border-radius: 8px;
  max-width: 700px;
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

.subscription-form h2 {
  margin: 0 0 25px 0;
  color: #2c3e50;
}

.form-section {
  margin-bottom: 30px;
}

.form-section h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
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
  margin-bottom: 15px;
}

.form-row {
  display: flex;
  gap: 15px;
}

.form-row .form-group {
  flex: 1;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #2c3e50;
  font-size: 14px;
}

.form-input,
.form-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-input:focus,
.form-select:focus {
  border-color: #3498db;
  outline: none;
}

.search-container {
  position: relative;
}

.search-status {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #666;
  font-size: 12px;
}

.search-results {
  position: absolute;
  width: 100%;
  background: white;
  border: 1px solid #ddd;
  border-top: none;
  border-radius: 0 0 4px 4px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 10;
}

.search-result-item {
  padding: 10px 12px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.search-result-item:hover {
  background: #f8f9fa;
}

.result-email {
  font-weight: 500;
  color: #2c3e50;
}

.result-name {
  font-size: 12px;
  color: #666;
}

.selected-user {
  margin-top: 15px;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 12px 15px;
  background: #f8f9fa;
  border-radius: 4px;
}

.user-email {
  font-weight: 500;
  color: #2c3e50;
}

.user-name {
  color: #666;
  flex: 1;
}

.clear-btn {
  padding: 5px 10px;
  background: #e9ecef;
  color: #495057;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.clear-btn:hover {
  background: #dee2e6;
}

.loading-plans {
  padding: 20px;
  text-align: center;
  color: #666;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #eee;
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
</style>
