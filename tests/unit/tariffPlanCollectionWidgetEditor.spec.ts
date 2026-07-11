/**
 * TariffPlanCollection widget editor descriptor + tab oracle.
 *
 * Installing the subscription-admin plugin registers a widget editor descriptor
 * for componentName 'TariffPlanCollection' through the SHARED cms-admin seam (no
 * subscription strings in cms-admin — OCP). The descriptor carries the shared
 * config contract that the fe-user TariffPlanCollection component reads; its
 * editor tab renders the source_mode select, the category select / plan
 * dual-list, the default_view select and the heading input, and binds
 * v-model:config (the array round-trips for plan_slugs, the strings for
 * source_mode/default_view/category/heading).
 *
 * Engineering requirements (binding, restated): TDD-first (this RED set); SOLID
 * (OCP via the registry seam; SRP — the descriptor owns its config/preview);
 * DRY; Liskov; clean code; no overengineering. Quality guard: ``npm run test``
 * + ``npm run lint`` + ``vue-tsc``.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import type { Component } from 'vue';
import { PluginRegistry, PlatformSDK } from 'vbwd-view-component';
import subscriptionAdminPlugin from '../../index';
import { getWidgetEditor, registerWidgetEditor } from '../../../cms-admin/index';
import { registerTariffPlanCollectionWidgetEditor } from '../../src/widgets/registerTariffPlanCollectionWidgetEditor';

beforeAll(() => {
  registerTariffPlanCollectionWidgetEditor(registerWidgetEditor);
});

beforeEach(() => {
  // Live-data fetches in the editor tab: stub them per-test.
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/v1/admin/tarif-plan-categories')) {
        return {
          ok: true,
          json: async () => ({
            categories: [
              { id: 'cat-1', name: 'Root', slug: 'root' },
              { id: 'cat-2', name: 'Pro', slug: 'pro' },
            ],
          }),
        } as Response;
      }
      if (url.includes('/api/v1/tarif-plans')) {
        return {
          ok: true,
          json: async () => ({
            plans: [
              { slug: 'basic', name: 'Basic' },
              { slug: 'premium', name: 'Premium' },
            ],
          }),
        } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    }),
  );
});

describe('TariffPlanCollection editor descriptor', () => {
  it('registers a TariffPlanCollection descriptor through the shared seam', () => {
    expect(getWidgetEditor('TariffPlanCollection')).toBeDefined();
  });

  it('defaultConfig() returns the shared contract shape', () => {
    const descriptor = getWidgetEditor('TariffPlanCollection')!;
    const config = descriptor.defaultConfig();
    expect(config).toMatchObject({
      component_name: 'TariffPlanCollection',
      source_mode: 'category',
      category: '',
      plan_slugs: [],
      default_view: 'cards',
    });
    expect(Array.isArray(config.plan_slugs)).toBe(true);
  });

  it('cssHint targets the widget root class', () => {
    const descriptor = getWidgetEditor('TariffPlanCollection')!;
    expect(descriptor.cssHint).toBeTruthy();
    expect(descriptor.cssHint).toContain('tariff-plan-collection');
  });

  it('buildPreview emits a static plan-card mock containing the heading', () => {
    const descriptor = getWidgetEditor('TariffPlanCollection')!;
    const preview = descriptor.buildPreview({
      component_name: 'TariffPlanCollection',
      heading: 'Choose your plan',
    });
    expect(typeof preview.html).toBe('string');
    expect(preview.html).toContain('tariff-plan-collection');
    expect(preview.html).toContain('Choose your plan');
  });
});

describe('TariffPlanCollection editor tab', () => {
  function getDescriptor() {
    return getWidgetEditor('TariffPlanCollection')!;
  }

  it('renders the source_mode + default_view selects and a heading input', () => {
    const descriptor = getDescriptor();
    const wrapper = mount(descriptor.generalTabComponent as Component, {
      props: { config: descriptor.defaultConfig() },
      global: { mocks: { $t: (key: string) => key } },
    });
    expect(wrapper.find('[data-test="source-mode"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="default-view"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="heading"]').exists()).toBe(true);
  });

  it('shows the live category select (slugs from the categories API) in category mode', async () => {
    const descriptor = getDescriptor();
    const wrapper = mount(descriptor.generalTabComponent as Component, {
      props: { config: descriptor.defaultConfig() },
      global: { mocks: { $t: (key: string) => key } },
    });
    await flushPromises();
    const categorySelect = wrapper.find('[data-test="category"]');
    expect(categorySelect.exists()).toBe(true);
    const html = wrapper.html();
    expect(html).toContain('root');
    expect(html).toContain('pro');
  });

  it('emits the chosen category slug into config.category', async () => {
    const descriptor = getDescriptor();
    const wrapper = mount(descriptor.generalTabComponent as Component, {
      props: { config: descriptor.defaultConfig() },
      global: { mocks: { $t: (key: string) => key } },
    });
    await flushPromises();
    await wrapper.find('[data-test="category"]').setValue('pro');
    const emitted = wrapper.emitted('update:config');
    expect(emitted).toBeTruthy();
    const lastPayload = emitted![emitted!.length - 1][0] as Record<string, unknown>;
    expect(lastPayload.category).toBe('pro');
  });

  it('switches to a plan dual-list when source_mode is slugs', async () => {
    const descriptor = getDescriptor();
    const wrapper = mount(descriptor.generalTabComponent as Component, {
      props: { config: { ...descriptor.defaultConfig(), source_mode: 'slugs' } },
      global: { mocks: { $t: (key: string) => key } },
    });
    await flushPromises();
    expect(wrapper.find('[data-testid="dual-list-plans"]').exists()).toBe(true);
    // The category select must NOT render in slugs mode.
    expect(wrapper.find('[data-test="category"]').exists()).toBe(false);
  });

  it('binds plan_slugs as a string[] via the dual-list', async () => {
    const descriptor = getDescriptor();
    const wrapper = mount(descriptor.generalTabComponent as Component, {
      props: { config: { ...descriptor.defaultConfig(), source_mode: 'slugs' } },
      global: { mocks: { $t: (key: string) => key } },
    });
    await flushPromises();
    await wrapper.find('[data-testid="dual-list-assign-basic"]').trigger('click');
    const emitted = wrapper.emitted('update:config');
    expect(emitted).toBeTruthy();
    const lastPayload = emitted![emitted!.length - 1][0] as Record<string, unknown>;
    expect(Array.isArray(lastPayload.plan_slugs)).toBe(true);
    expect(lastPayload.plan_slugs).toEqual(['basic']);
  });

  it('emits source_mode as a string when the select changes', async () => {
    const descriptor = getDescriptor();
    const wrapper = mount(descriptor.generalTabComponent as Component, {
      props: { config: descriptor.defaultConfig() },
      global: { mocks: { $t: (key: string) => key } },
    });
    await wrapper.find('[data-test="source-mode"]').setValue('slugs');
    const emitted = wrapper.emitted('update:config');
    expect(emitted).toBeTruthy();
    const lastPayload = emitted![emitted!.length - 1][0] as Record<string, unknown>;
    expect(lastPayload.source_mode).toBe('slugs');
  });

  it('emits default_view as a string when the select changes', async () => {
    const descriptor = getDescriptor();
    const wrapper = mount(descriptor.generalTabComponent as Component, {
      props: { config: descriptor.defaultConfig() },
      global: { mocks: { $t: (key: string) => key } },
    });
    await wrapper.find('[data-test="default-view"]').setValue('table');
    const emitted = wrapper.emitted('update:config');
    expect(emitted).toBeTruthy();
    const lastPayload = emitted![emitted!.length - 1][0] as Record<string, unknown>;
    expect(lastPayload.default_view).toBe('table');
  });

  it('emits heading as a string when the input changes', async () => {
    const descriptor = getDescriptor();
    const wrapper = mount(descriptor.generalTabComponent as Component, {
      props: { config: descriptor.defaultConfig() },
      global: { mocks: { $t: (key: string) => key } },
    });
    await wrapper.find('[data-test="heading"]').setValue('Our plans');
    const emitted = wrapper.emitted('update:config');
    expect(emitted).toBeTruthy();
    const lastPayload = emitted![emitted!.length - 1][0] as Record<string, unknown>;
    expect(lastPayload.heading).toBe('Our plans');
  });
});

describe('TariffPlanCollection presentation config', () => {
  function getDescriptor() {
    return getWidgetEditor('TariffPlanCollection')!;
  }

  it('defaultConfig carries the NativePricingPlans-portable presentation keys', () => {
    const config = getDescriptor().defaultConfig();
    for (const key of [
      'subtitle',
      'theme',
      'image_url',
      'features',
      'highlight_slug',
      'highlight_badge',
      'cta_label',
    ]) {
      expect(config).toHaveProperty(key);
    }
    expect(Array.isArray(config.features)).toBe(true);
  });

  it('defaults a freshly-created widget to the teal pricing-card look', () => {
    const config = getDescriptor().defaultConfig();
    // Mirrors the backend seed's default look (theme "teal" + the 4 native
    // bullets). highlight_slug stays '' because the default category is empty
    // and 'pro' is only valid in the root category.
    expect(config.theme).toBe('teal');
    expect(config.features).toEqual([
      'All core platform features',
      'Unlimited projects',
      'Priority email support',
      'Cancel anytime',
    ]);
    expect(config.highlight_slug).toBe('');
  });

  it('buildPreview for the default config reflects the teal theme + features', () => {
    const descriptor = getDescriptor();
    const preview = descriptor.buildPreview(descriptor.defaultConfig());
    // Teal theme primary token (#14b8a6) is present in the emitted styles/html.
    expect(preview.html + preview.baseStyles).toContain('#14b8a6');
    // The default 4 feature bullets render in the preview checklist.
    expect(preview.html).toContain('All core platform features');
    expect(preview.html).toContain('Cancel anytime');
  });

  it('buildPreview marks the emphasized card, its badge and the feature checklist', () => {
    const preview = getDescriptor().buildPreview({
      component_name: 'TariffPlanCollection',
      heading: 'Choose your plan',
      highlight_slug: 'pro',
      highlight_badge: 'Best Value',
      features: ['2000 MB Bandwidth', '5 GB Space'],
      image_url: 'https://cdn.example/icon.png',
    });
    expect(preview.html).toContain('tariff-plan-card--featured');
    expect(preview.html).toContain('Best Value');
    expect(preview.html).toContain('2000 MB Bandwidth');
    expect(preview.html).toContain('https://cdn.example/icon.png');
    expect(typeof preview.baseStyles).toBe('string');
  });

  it('renders the new presentation fields in the editor tab', async () => {
    const descriptor = getDescriptor();
    const wrapper = mount(descriptor.generalTabComponent as Component, {
      props: { config: descriptor.defaultConfig() },
      global: { mocks: { $t: (key: string) => key } },
    });
    await flushPromises();
    for (const testid of [
      'subtitle',
      'cta-label',
      'theme',
      'image-url',
      'highlight-slug',
      'highlight-badge',
      'features',
    ]) {
      expect(wrapper.find(`[data-test="${testid}"]`).exists()).toBe(true);
    }
  });

  it('emits the chosen theme into config.theme', async () => {
    const descriptor = getDescriptor();
    const wrapper = mount(descriptor.generalTabComponent as Component, {
      props: { config: descriptor.defaultConfig() },
      global: { mocks: { $t: (key: string) => key } },
    });
    await wrapper.find('[data-test="theme"]').setValue('teal');
    const emitted = wrapper.emitted('update:config');
    expect(emitted).toBeTruthy();
    const payload = emitted![emitted!.length - 1][0] as Record<string, unknown>;
    expect(payload.theme).toBe('teal');
  });

  it('emits the image URL into config.image_url', async () => {
    const descriptor = getDescriptor();
    const wrapper = mount(descriptor.generalTabComponent as Component, {
      props: { config: descriptor.defaultConfig() },
      global: { mocks: { $t: (key: string) => key } },
    });
    await wrapper.find('[data-test="image-url"]').setValue('https://cdn.example/icon.png');
    const emitted = wrapper.emitted('update:config');
    expect(emitted).toBeTruthy();
    const payload = emitted![emitted!.length - 1][0] as Record<string, unknown>;
    expect(payload.image_url).toBe('https://cdn.example/icon.png');
  });

  it('splits the features textarea into a string[] on config.features', async () => {
    const descriptor = getDescriptor();
    const wrapper = mount(descriptor.generalTabComponent as Component, {
      props: { config: descriptor.defaultConfig() },
      global: { mocks: { $t: (key: string) => key } },
    });
    await wrapper.find('[data-test="features"]').setValue('2000 MB Bandwidth\n5 GB Space');
    const emitted = wrapper.emitted('update:config');
    expect(emitted).toBeTruthy();
    const payload = emitted![emitted!.length - 1][0] as Record<string, unknown>;
    expect(payload.features).toEqual(['2000 MB Bandwidth', '5 GB Space']);
  });

  it('sources the emphasize-plan dropdown from the plans API', async () => {
    const descriptor = getDescriptor();
    const wrapper = mount(descriptor.generalTabComponent as Component, {
      props: { config: descriptor.defaultConfig() },
      global: { mocks: { $t: (key: string) => key } },
    });
    await flushPromises();
    const html = wrapper.find('[data-test="highlight-slug"]').html();
    expect(html).toContain('basic');
    expect(html).toContain('premium');
  });
});

describe('subscription-admin install() wires the widget editor', () => {
  it('registers TariffPlanCollection through the cms-admin seam on install', async () => {
    const registry = new PluginRegistry();
    const sdk = new PlatformSDK();
    // cms-admin is a declared dependency; register a no-op stub so the registry can resolve it.
    registry.register({ name: 'cms-admin', version: '26.6.1', install() {} });
    registry.register(subscriptionAdminPlugin);
    await registry.installAll(sdk);

    for (let attempt = 0; attempt < 50 && !getWidgetEditor('TariffPlanCollection'); attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    expect(getWidgetEditor('TariffPlanCollection')).toBeDefined();
  });
});
