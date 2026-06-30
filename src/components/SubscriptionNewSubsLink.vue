<template>
  <!-- Shown on every admin page as a plain icon + string: a quick stat +
       shortcut to the Subscriptions list. Visibility is gated only by the
       subscription.subscriptions.view permission (the registry filters it),
       so core stays agnostic. -->
  <RouterLink
    class="subscription-topbar-newsubs"
    to="/admin/subscriptions"
    data-testid="subscription-topbar-newsubs"
  >
    <Icon name="repeat" />
    <span>{{ t('subscription.topbar.newSubs', { count: newSubs }) }}</span>
  </RouterLink>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { Icon } from 'vbwd-view-component';
import { api } from '@/api';

const { t } = useI18n();

const newSubs = ref(0);

async function loadCount(): Promise<void> {
  try {
    // "New" = pending subscriptions (created, not yet active). Mirrors the
    // dashboard widget's countByStatus pattern.
    const response = (await api.get(
      '/admin/subscriptions/?status=pending&limit=1',
    )) as { total?: number };
    newSubs.value = response.total || 0;
  } catch {
    // Backend unreachable or permission missing — keep zero, stay quiet.
  }
}

// The topbar lives in the persistent admin layout, so this mounts once.
onMounted(loadCount);
</script>

<style scoped>
/* Plain icon + string — no button border/background. */
.subscription-topbar-newsubs {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #2c3e50;
  text-decoration: none;
  font-size: 0.9rem;
  line-height: 1;
}

.subscription-topbar-newsubs:hover {
  text-decoration: underline;
}
</style>
