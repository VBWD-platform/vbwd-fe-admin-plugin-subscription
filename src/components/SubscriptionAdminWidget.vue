<template>
  <div
    class="stat-card plugin-widget"
    data-testid="subscription-admin-widget"
  >
    <h3>{{ $t('subscription.widget.title') }}</h3>
    <div
      v-if="loading"
      class="stat-value"
    >
      ...
    </div>
    <template v-else>
      <div
        class="stat-value"
        data-testid="subscription-admin-widget-active"
      >
        {{ stats.active }}
      </div>
      <div class="stat-label">
        {{ $t('subscription.widget.active') }}
      </div>
      <div
        v-if="stats.pending > 0 || stats.cancelled > 0"
        class="stat-sub"
      >
        <span v-if="stats.pending > 0">{{ stats.pending }} {{ $t('subscription.widget.pending') }}</span>
        <span v-if="stats.pending > 0 && stats.cancelled > 0">·</span>
        <span v-if="stats.cancelled > 0">{{ stats.cancelled }} {{ $t('subscription.widget.cancelledThisPeriod') }}</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '@/api';

interface Stats {
  active: number;
  pending: number;
  cancelled: number;
}

const stats = ref<Stats>({ active: 0, pending: 0, cancelled: 0 });
const loading = ref(true);

async function countByStatus(status: string): Promise<number> {
  try {
    const response = await api.get(
      `/admin/subscriptions/?status=${status}&limit=1`,
    ) as { total?: number };
    return response.total || 0;
  } catch {
    return 0;
  }
}

onMounted(async () => {
  try {
    const [active, pending, cancelled] = await Promise.all([
      countByStatus('active'),
      countByStatus('pending'),
      countByStatus('cancelled'),
    ]);
    stats.value = { active, pending, cancelled };
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.stat-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem 1.25rem;
}
.stat-card h3 {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #4a5568;
  margin: 0 0 0.5rem;
}
.stat-value {
  font-size: 2rem;
  font-weight: 600;
  line-height: 1;
  color: #1a202c;
}
.stat-label {
  font-size: 0.85rem;
  color: #4a5568;
  margin-top: 0.25rem;
}
.stat-sub {
  display: flex;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: #718096;
  margin-top: 0.75rem;
  flex-wrap: wrap;
}
</style>
