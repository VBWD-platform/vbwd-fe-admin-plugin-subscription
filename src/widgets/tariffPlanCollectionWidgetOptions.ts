/**
 * Static option lists + the shared config contract defaults for the
 * TariffPlanCollection widget editor.
 *
 * The fe-user TariffPlanCollection component reads these exact keys — do not
 * rename. Per [[reference_admin_config_select_static_only]] the source_mode and
 * default_view selects are driven by static arrays; the category list and the
 * plan dual-list are the live-data parts (fetched in the editor tab).
 */
export const SOURCE_MODE_OPTIONS = ['category', 'slugs'] as const;
export const DEFAULT_VIEW_OPTIONS = ['cards', 'table'] as const;

// The six shared theme names (Landing1View / NativePricingPlans parity). An
// unknown value falls back to 'default' in the fe-user component.
export const THEME_OPTIONS = ['default', 'light', 'dark', 'teal', 'indigo', 'emerald'] as const;

// The default pricing-card feature bullets a freshly-created widget ships with.
// These mirror the backend `NATIVE_PRICING_FEATURES` constant (the seed's
// default look) — fe-admin cannot import the Python constant, so the strings
// are duplicated literally here and MUST be kept in sync with the backend.
export const DEFAULT_PRICING_FEATURES = [
  'All core platform features',
  'Unlimited projects',
  'Priority email support',
  'Cancel anytime',
] as const;

export function tariffPlanCollectionDefaultConfig(): Record<string, unknown> {
  return {
    component_name: 'TariffPlanCollection',
    source_mode: 'category',
    category: '',
    plan_slugs: [],
    default_view: 'cards',
    heading: '',
    // Presentation controls — key names match NativePricingPlans EXACTLY so an
    // operator's config is portable between the two widgets. The default look
    // matches what the backend seed now ships: the teal pricing-card theme plus
    // the four native feature bullets.
    subtitle: '',
    theme: 'teal',
    image_url: '',
    features: [...DEFAULT_PRICING_FEATURES],
    // Leave highlight_slug empty: the default `category` here is empty and is
    // chosen at creation time; `pro` is only valid in the root category, so
    // defaulting a highlight would point at a nonexistent plan in other
    // categories. The operator picks the emphasized plan per category. (The
    // backend seed sets highlight=pro only on its own root-category record.)
    highlight_slug: '',
    highlight_badge: '',
    cta_label: '',
  };
}
