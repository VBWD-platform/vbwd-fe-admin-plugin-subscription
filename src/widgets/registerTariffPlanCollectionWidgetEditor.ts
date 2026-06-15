/**
 * Registers the TariffPlanCollection widget editor descriptor through the
 * SHARED cms-admin widget-editor seam (OCP).
 *
 * The subscription-admin plugin owns this descriptor — cms-admin carries no
 * subscription strings. The registry function is imported from the stable
 * cms-admin plugin path, mirroring registerMeinchatChatWidgetEditor.
 */
import type { registerWidgetEditor as RegisterWidgetEditor } from '../../../cms-admin/index';
import TariffPlanCollectionWidgetEditorTab from './TariffPlanCollectionWidgetEditorTab.vue';
import { tariffPlanCollectionDefaultConfig } from './tariffPlanCollectionWidgetOptions';

export function registerTariffPlanCollectionWidgetEditor(
  registerWidgetEditor: typeof RegisterWidgetEditor,
): void {
  registerWidgetEditor({
    componentName: 'TariffPlanCollection',

    defaultConfig: tariffPlanCollectionDefaultConfig,

    generalTabComponent: TariffPlanCollectionWidgetEditorTab,

    cssHint:
      'Target <code>.tariff-plan-collection</code>, <code>.tariff-plan-collection__card</code>, <code>.tariff-plan-collection__heading</code>.',

    buildPreview(config) {
      const heading = (config.heading as string) || '';
      const headingHtml = heading
        ? `<h2 class="tariff-plan-collection__heading" style="text-align:center;margin:0 0 1rem;font-size:1.4rem;color:#1f2937">${heading}</h2>`
        : '';

      const html = `<div class="tariff-plan-collection" style="font-family:inherit">
  ${headingHtml}
  <div class="tariff-plan-collection__grid" style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap">
    <div class="tariff-plan-collection__card" style="width:200px;padding:1.25rem;border:1px solid #e2e8f0;border-radius:10px;text-align:center;background:#fff">
      <div style="font-weight:600;color:#1f2937;margin-bottom:.5rem">Basic</div>
      <div style="font-size:1.6rem;font-weight:700;color:#3498db">€9</div>
      <div style="font-size:.85rem;color:#6b7280;margin-top:.25rem">per month</div>
    </div>
    <div class="tariff-plan-collection__card" style="width:200px;padding:1.25rem;border:1px solid #e2e8f0;border-radius:10px;text-align:center;background:#fff">
      <div style="font-weight:600;color:#1f2937;margin-bottom:.5rem">Premium</div>
      <div style="font-size:1.6rem;font-weight:700;color:#3498db">€29</div>
      <div style="font-size:.85rem;color:#6b7280;margin-top:.25rem">per month</div>
    </div>
  </div>
</div>`;
      return { html };
    },
  });
}
