<template>
  <div class="field-group">
    <label class="field-label">{{ $t('subscriptionAdmin.tariffPlanWidget.sourceMode') }}</label>
    <select
      data-test="source-mode"
      :value="sourceMode"
      class="field-input"
      @change="set('source_mode', ($event.target as HTMLSelectElement).value)"
    >
      <option
        v-for="sourceModeOption in SOURCE_MODE_OPTIONS"
        :key="sourceModeOption"
        :value="sourceModeOption"
      >
        {{ $t(`subscriptionAdmin.tariffPlanWidget.sourceModeOption.${sourceModeOption}`) }}
      </option>
    </select>
  </div>

  <div
    v-if="sourceMode === 'category'"
    class="field-group"
  >
    <label class="field-label">{{ $t('subscriptionAdmin.tariffPlanWidget.category') }}</label>
    <select
      data-test="category"
      :value="config.category"
      class="field-input"
      @change="set('category', ($event.target as HTMLSelectElement).value)"
    >
      <option value="">
        {{ $t('subscriptionAdmin.tariffPlanWidget.categoryAll') }}
      </option>
      <option
        v-for="category in availableCategories"
        :key="category.slug"
        :value="category.slug"
      >
        {{ category.name }} ({{ category.slug }})
      </option>
    </select>
    <p class="field-hint">
      {{ $t('subscriptionAdmin.tariffPlanWidget.categoryHint') }}
    </p>
  </div>

  <div
    v-else
    class="field-group"
  >
    <label class="field-label">{{ $t('subscriptionAdmin.tariffPlanWidget.plans') }}</label>
    <DualListSelector
      testid="plans"
      :model-value="selectedPlanSlugs"
      :options="planOptions"
      @update:model-value="setPlanSlugs"
    />
  </div>

  <div class="field-group">
    <label class="field-label">{{ $t('subscriptionAdmin.tariffPlanWidget.defaultView') }}</label>
    <select
      data-test="default-view"
      :value="config.default_view"
      class="field-input"
      @change="set('default_view', ($event.target as HTMLSelectElement).value)"
    >
      <option
        v-for="defaultViewOption in DEFAULT_VIEW_OPTIONS"
        :key="defaultViewOption"
        :value="defaultViewOption"
      >
        {{ $t(`subscriptionAdmin.tariffPlanWidget.defaultViewOption.${defaultViewOption}`) }}
      </option>
    </select>
  </div>

  <div class="field-group">
    <label class="field-label">{{ $t('subscriptionAdmin.tariffPlanWidget.heading') }}</label>
    <input
      data-test="heading"
      :value="config.heading"
      class="field-input"
      type="text"
      :placeholder="$t('subscriptionAdmin.tariffPlanWidget.headingPlaceholder')"
      @input="set('heading', ($event.target as HTMLInputElement).value)"
    >
  </div>

  <div class="field-group">
    <label class="field-label">{{ $t('subscriptionAdmin.tariffPlanWidget.subtitle') }}</label>
    <input
      data-test="subtitle"
      :value="config.subtitle"
      class="field-input"
      type="text"
      :placeholder="$t('subscriptionAdmin.tariffPlanWidget.subtitlePlaceholder')"
      @input="set('subtitle', ($event.target as HTMLInputElement).value)"
    >
  </div>

  <div class="field-group">
    <label class="field-label">{{ $t('subscriptionAdmin.tariffPlanWidget.ctaLabel') }}</label>
    <input
      data-test="cta-label"
      :value="config.cta_label"
      class="field-input"
      type="text"
      :placeholder="$t('subscriptionAdmin.tariffPlanWidget.ctaLabelPlaceholder')"
      @input="set('cta_label', ($event.target as HTMLInputElement).value)"
    >
  </div>

  <div class="field-group">
    <label class="field-label">{{ $t('subscriptionAdmin.tariffPlanWidget.theme') }}</label>
    <select
      data-test="theme"
      :value="theme"
      class="field-input"
      @change="set('theme', ($event.target as HTMLSelectElement).value)"
    >
      <option
        v-for="themeOption in THEME_OPTIONS"
        :key="themeOption"
        :value="themeOption"
      >
        {{ themeOption }}
      </option>
    </select>
    <p class="field-hint">
      {{ $t('subscriptionAdmin.tariffPlanWidget.themeHint') }}
    </p>
  </div>

  <div class="field-group">
    <label class="field-label">{{ $t('subscriptionAdmin.tariffPlanWidget.imageUrl') }}</label>
    <input
      data-test="image-url"
      :value="config.image_url"
      class="field-input field-input--mono"
      type="text"
      placeholder="https://…"
      @input="set('image_url', ($event.target as HTMLInputElement).value)"
    >
    <p class="field-hint">
      {{ $t('subscriptionAdmin.tariffPlanWidget.imageUrlHint') }}
    </p>
  </div>

  <div class="field-group">
    <label class="field-label">{{ $t('subscriptionAdmin.tariffPlanWidget.highlightSlug') }}</label>
    <select
      data-test="highlight-slug"
      :value="config.highlight_slug || ''"
      class="field-input"
      @change="set('highlight_slug', ($event.target as HTMLSelectElement).value)"
    >
      <option value="">
        {{ $t('subscriptionAdmin.tariffPlanWidget.highlightNone') }}
      </option>
      <option
        v-for="plan in availablePlans"
        :key="plan.slug"
        :value="plan.slug"
      >
        {{ plan.name }} ({{ plan.slug }})
      </option>
    </select>
  </div>

  <div class="field-group">
    <label class="field-label">{{ $t('subscriptionAdmin.tariffPlanWidget.highlightBadge') }}</label>
    <input
      data-test="highlight-badge"
      :value="config.highlight_badge"
      class="field-input"
      type="text"
      :placeholder="$t('subscriptionAdmin.tariffPlanWidget.highlightBadgePlaceholder')"
      @input="set('highlight_badge', ($event.target as HTMLInputElement).value)"
    >
  </div>

  <div class="field-group">
    <label class="field-label">{{ $t('subscriptionAdmin.tariffPlanWidget.features') }}</label>
    <textarea
      data-test="features"
      :value="featuresText"
      class="field-input field-input--mono"
      rows="5"
      :placeholder="$t('subscriptionAdmin.tariffPlanWidget.featuresPlaceholder')"
      @input="onFeaturesInput(($event.target as HTMLTextAreaElement).value)"
    />
    <p class="field-hint">
      {{ $t('subscriptionAdmin.tariffPlanWidget.featuresHint') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import DualListSelector, { type DualListOption } from '@/components/DualListSelector.vue';
import {
  SOURCE_MODE_OPTIONS,
  DEFAULT_VIEW_OPTIONS,
  THEME_OPTIONS,
} from './tariffPlanCollectionWidgetOptions';

interface TariffPlanCategory {
  slug: string;
  name: string;
}

interface TariffPlanItem {
  slug: string;
  name: string;
}

const props = defineProps<{ config: Record<string, unknown> }>();
const emit = defineEmits<{ (e: 'update:config', val: Record<string, unknown>): void }>();

const config = computed(() => props.config);
const sourceMode = computed<string>(() => (config.value.source_mode as string) || 'category');
const theme = computed<string>(() => (config.value.theme as string) || 'default');
const selectedPlanSlugs = computed<string[]>(() =>
  Array.isArray(config.value.plan_slugs) ? (config.value.plan_slugs as string[]) : [],
);
const featuresText = computed<string>(() =>
  Array.isArray(config.value.features) ? (config.value.features as string[]).join('\n') : '',
);

const availableCategories = ref<TariffPlanCategory[]>([]);
const availablePlans = ref<TariffPlanItem[]>([]);

const planOptions = computed<DualListOption[]>(() =>
  availablePlans.value.map((plan) => ({ value: plan.slug, label: plan.name })),
);

async function loadCategories(): Promise<void> {
  try {
    const response = await fetch('/api/v1/admin/tarif-plan-categories');
    const data = await response.json();
    availableCategories.value = data.categories ?? [];
  } catch {
    availableCategories.value = [];
  }
}

async function loadPlans(): Promise<void> {
  try {
    const response = await fetch('/api/v1/tarif-plans');
    const data = await response.json();
    availablePlans.value = data.plans ?? [];
  } catch {
    availablePlans.value = [];
  }
}

function set(key: string, value: unknown): void {
  emit('update:config', { ...props.config, [key]: value });
}

function setPlanSlugs(slugs: string[]): void {
  set('plan_slugs', slugs);
}

function onFeaturesInput(value: string): void {
  // Keep raw lines so the controlled textarea round-trips while typing; the
  // fe-user widget trims and drops blanks at render time.
  set('features', value.split('\n'));
}

onMounted(() => {
  // The category select needs the category list; the plan dual-list AND the
  // emphasize-plan dropdown both need the plan list — so load plans regardless
  // of the source mode.
  loadCategories();
  loadPlans();
});

watch(sourceMode, (mode) => {
  if (mode === 'category' && !availableCategories.value.length) {
    loadCategories();
  }
  if (mode === 'slugs' && !availablePlans.value.length) {
    loadPlans();
  }
});
</script>

<style scoped>
.field-hint {
  margin: 0.25rem 0 0;
  font-size: 0.8rem;
  color: var(--vbwd-text-muted, #6b7280);
}
</style>
