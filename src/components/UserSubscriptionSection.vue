<template>
  <div
    v-if="user && user.subscription"
    class="section"
  >
    <h3>{{ $t('users.subscription') }}</h3>
    <div class="info-grid">
      <div class="info-item">
        <label>{{ $t('subscriptions.plan') }}</label>
        <span>{{ user.subscription.plan || $t('common.none') }}</span>
      </div>
      <div class="info-item">
        <label>{{ $t('subscriptions.status') }}</label>
        <span
          class="subscription-status"
          :class="user.subscription.status?.toLowerCase()"
        >
          {{ user.subscription.status || $t('common.na') }}
        </span>
      </div>
      <div
        v-if="user.subscription.expires_at"
        class="info-item"
      >
        <label>{{ $t('subscriptions.expires') }}</label>
        <span>{{ formatDate(user.subscription.expires_at) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Subscription summary section on the core User Details page — contributed by
 * the subscription-admin plugin via `extensionRegistry.userDetailsSections`.
 * Core stays subscription-agnostic; it only knows it renders plugin sections
 * with `{ user, loading, userId }` props.
 */
interface UserWithSubscription {
  subscription?: {
    plan: string | null;
    status: string | null;
    expires_at?: string | null;
  };
}

defineProps<{
  user: UserWithSubscription | null;
  loading?: boolean;
  userId?: string;
}>();

function formatDate(dateString?: string | null): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString();
}
</script>

<style scoped>
.section {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
}

.section h3 {
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

.subscription-status {
  text-transform: capitalize;
}

.subscription-status.active {
  color: #155724;
}

.subscription-status.canceled,
.subscription-status.expired {
  color: #721c24;
}
</style>
