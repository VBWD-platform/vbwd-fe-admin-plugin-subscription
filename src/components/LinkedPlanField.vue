<template>
  <div
    v-if="isUserType"
    class="form-section"
  >
    <div class="form-grid">
      <div class="form-group">
        <label>Linked Plan Slug</label>
        <input
          :value="form.linked_plan_slug"
          type="text"
          class="form-input mono"
          placeholder="e.g. free, basic, pro"
          @input="onInput"
        >
        <span class="form-hint">Auto-assign this level when a user subscribes to a plan with this slug</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  form: { linked_plan_slug: string };
  isNew: boolean;
  isUserType: boolean;
  canManage: boolean;
}>();

const emit = defineEmits<{
  (event: 'update:field', key: string, value: string): void;
}>();

function onInput(event: Event) {
  emit('update:field', 'linked_plan_slug', (event.target as HTMLInputElement).value);
}
</script>

<style scoped>
.form-section { margin-bottom: 24px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 4px; }
.form-group label { font-size: 13px; font-weight: 600; color: #374151; }
.form-input { padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; }
.form-input:focus { border-color: #3b82f6; outline: none; }
.form-hint { font-size: 12px; color: #9ca3af; }
.mono { font-family: monospace; }
</style>
