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

export function tariffPlanCollectionDefaultConfig(): Record<string, unknown> {
  return {
    component_name: 'TariffPlanCollection',
    source_mode: 'category',
    category: '',
    plan_slugs: [],
    default_view: 'cards',
    heading: '',
  };
}
