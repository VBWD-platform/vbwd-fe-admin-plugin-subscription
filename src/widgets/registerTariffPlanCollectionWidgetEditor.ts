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
      'Target <code>.tariff-plan-collection</code>, <code>.tariff-plan-card</code>, <code>.tariff-plan-card--featured</code>, <code>.tariff-plan-card__badge</code>, <code>.tariff-plan-card__features</code>, <code>.tariff-plan-collection__heading</code>.',

    buildPreview(config) {
      // Theme swatches mirror the fe-user component's per-theme tokens so the
      // admin live-preview matches what TariffPlanCollection renders.
      const THEMES: Record<
        string,
        { primary: string; hover: string; cardBg: string; heading: string; muted: string }
      > = {
        default: { primary: '#3498db', hover: '#2980b9', cardBg: '#fff', heading: '#2c3e50', muted: '#666' },
        light: { primary: '#3498db', hover: '#2980b9', cardBg: '#fff', heading: '#1f2937', muted: '#6b7280' },
        dark: { primary: '#3b82f6', hover: '#2563eb', cardBg: '#1f2937', heading: '#f9fafb', muted: '#9ca3af' },
        teal: { primary: '#14b8a6', hover: '#0d9488', cardBg: '#fff', heading: '#1f2937', muted: '#6b7280' },
        indigo: { primary: '#6366f1', hover: '#4f46e5', cardBg: '#fff', heading: '#1f2937', muted: '#6b7280' },
        emerald: { primary: '#10b981', hover: '#059669', cardBg: '#fff', heading: '#1f2937', muted: '#6b7280' },
      };
      const theme = THEMES[(config.theme as string) || 'default'] ?? THEMES.default;
      const heading = (config.heading as string) || 'Select a Plan';
      const subtitle = (config.subtitle as string) || 'Choose the plan that fits you best';
      const cta = (config.cta_label as string) || 'Select Plan';
      const badge = (config.highlight_badge as string) || 'Most Popular';
      const highlight = (config.highlight_slug as string) || '';
      const imageUrl = (config.image_url as string) || '';
      const features = Array.isArray(config.features)
        ? (config.features as string[]).map((feature) => String(feature).trim()).filter(Boolean)
        : [];

      const check = `<svg viewBox="0 0 20 20" style="width:16px;height:16px;flex-shrink:0;color:${theme.primary}"><path d="M7.5 13.5 4 10l-1.2 1.2L7.5 16 17 6.5 15.8 5.3z" fill="currentColor"/></svg>`;
      const featureList = features.length
        ? `<ul class="tariff-plan-card__features" style="list-style:none;padding:0;margin:0 0 18px;text-align:left;display:flex;flex-direction:column;gap:8px">${features
            .map(
              (feature) =>
                `<li style="display:flex;align-items:center;gap:8px;color:${theme.muted};font-size:.9rem">${check}<span>${feature}</span></li>`,
            )
            .join('')}</ul>`
        : '';
      const imageTag = imageUrl
        ? `<img class="tariff-plan-card__image" src="${imageUrl}" alt="" style="display:block;width:64px;height:64px;object-fit:contain;margin:0 auto 14px">`
        : '';

      const baseStyles = `
.tariff-plan-collection__grid{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap}
.tariff-plan-card{position:relative;display:flex;flex-direction:column;width:200px;padding:1.25rem;border:2px solid transparent;border-radius:10px;text-align:center;background:${theme.cardBg};box-shadow:0 2px 12px rgba(0,0,0,.08)}
.tariff-plan-card--featured{border-color:${theme.primary};box-shadow:0 12px 32px rgba(0,0,0,.16)}
.tariff-plan-card__badge{position:absolute;top:0;left:50%;transform:translate(-50%,-50%);background:${theme.primary};color:#fff;font-size:.7rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:4px 12px;border-radius:999px}
.tariff-plan-card__select{width:100%;margin-top:auto;padding:10px;background:${theme.primary};color:#fff;border:none;border-radius:6px;font-size:.9rem;font-weight:600;cursor:pointer}`;

      const card = (name: string, price: string, slug: string): string => {
        const featured = !!highlight && slug === highlight;
        return `<div class="tariff-plan-card${featured ? ' tariff-plan-card--featured' : ''}">${
          featured ? `<div class="tariff-plan-card__badge">${badge}</div>` : ''
        }${imageTag}<div style="font-weight:700;color:${theme.heading};margin-bottom:.5rem">${name}</div><div style="font-size:1.6rem;font-weight:800;color:${theme.primary};margin-bottom:.5rem">${price}</div>${featureList}<button class="tariff-plan-card__select">${cta}</button></div>`;
      };

      const header = `<div class="tariff-plan-collection__header" style="text-align:center;margin-bottom:1.5rem"><h2 class="tariff-plan-collection__heading" style="margin:0 0 .5rem;font-size:1.4rem;color:${theme.heading}">${heading}</h2><p style="margin:0;color:${theme.muted}">${subtitle}</p></div>`;

      const html = `<div class="tariff-plan-collection" style="font-family:inherit">${header}<div class="tariff-plan-collection__grid">${card(
        'Basic',
        '€9',
        'basic',
      )}${card('Pro', '€29', 'pro')}${card('Enterprise', '€99', 'enterprise')}</div></div>`;

      return { html, baseStyles };
    },
  });
}
