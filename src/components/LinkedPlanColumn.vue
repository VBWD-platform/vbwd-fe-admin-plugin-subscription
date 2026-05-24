<template>
  <span
    v-if="level && level.linked_plan_slug"
    class="badge badge--green"
  >{{ level.linked_plan_slug }}</span>
  <span
    v-else
    class="text-muted"
  >&mdash;</span>
</template>

<script setup lang="ts">
/**
 * "Linked Plan" cell on the core user Access Levels table — contributed by the
 * subscription-admin plugin via `extensionRegistry.accessLevelUserColumns`.
 * The matching form field is contributed via `accessLevelFormFields`
 * (LinkedPlanField); core stays subscription-agnostic.
 */
defineProps<{
  level: { linked_plan_slug?: string | null } | null;
}>();
</script>

<style scoped>
.badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
}
.badge--green {
  background: #d4edda;
  color: #155724;
}
.text-muted {
  color: #9ca3af;
}
</style>
