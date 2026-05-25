# Subscription Admin Plugin — LLM Guide (fe-admin)

Compact map for agents. Pair with [`ARCHITECTURE.md`](ARCHITECTURE.md) and
[`EXTENDING.md`](EXTENDING.md). Paths relative to
`vbwd-fe-admin/plugins/subscription-admin/`.

## Identity
- plugin id: `subscription-admin`; exports BOTH named `subscriptionAdminPlugin`
  AND `default` (loader robustness).
- source dir: `src/` (fe-admin convention — differs from backend/fe-user).
- Pinia store ids (options API): `planAdmin`, `categoryAdmin`, `addons`,
  `subscriptions`.

## Invariants
1. Never edit `vbwd-fe-admin/vue/src/` for subscription behaviour. Use the SDK +
   `extensionRegistry`.
2. Routes are added in `install()` (once); extensions (nav/tabs/sections/columns)
   in `activate()`; everything torn down in `deactivate()`.
3. Routes are children of `/admin/` → use **relative** paths (`plans`,
   `add-ons/:id/edit`), gated by `meta.requiredPermission`.
4. Core-page additions (invoice "Subscription Info", user Subscriptions/Add-ons
   tabs, access-level linked-plan) MUST go through `extensionRegistry`, not core.

## File map (where to change X)
| Goal | File |
|---|---|
| Routes + dashboard widget + extension registrations | `index.ts` |
| Plan CRUD/activate/archive/copy | `src/stores/planAdmin.ts` + `src/views/{Plans,PlanForm}.vue` |
| Category CRUD + attach/detach | `src/stores/categoryAdmin.ts` + `src/views/CategoryForm.vue` + `src/components/CategoriesTab.vue` |
| Add-on CRUD/activate | `src/stores/addons.ts` + `src/views/{AddOns,AddonForm}.vue` |
| Subscription list/detail/create/cancel/refund/extend/plan | `src/stores/subscriptions.ts` + `src/views/{Subscriptions,SubscriptionDetails,SubscriptionCreate}.vue` |
| Invoice "Subscription Info" block | `src/components/InvoiceSubscriptionSection.vue` |
| User Subscriptions/Add-ons tabs | `src/components/{UserSubscriptionsTab,UserAddonsTab}.vue` |
| User Details subscription block | `src/components/UserSubscriptionSection.vue` |
| Access-level ↔ plan linkage | `src/components/{LinkedPlanField,LinkedPlanColumn}.vue` |
| Dashboard widget | `src/components/SubscriptionAdminWidget.vue` |
| Config | `config.json` + `admin-config.json` |

## extensionRegistry contract (AdminExtension) — used in activate()
- `userDetailsSections: Component[]`
- `invoiceDetailSections: Component[]`
- `userEditTabs: { id, label, order, component, requiredPermission }[]`
- `accessLevelFormFields: { component, userOnly?, fields[] }[]`
- `accessLevelUserColumns: { id, header, component }[]`
- `sectionItems: Record<string, { label, to, position?, requiredPermission? }[]>`
  (e.g. `sales: [{ to:'/admin/subscriptions', position:'before:invoices' }]`)
- `navSections: { id, label, items: { label, to, requiredPermission }[] }[]`
- registered under key `'subscription-admin'`; unregistered in `deactivate()`.
- dashboard widget via `sdk.addComponent('SubscriptionAdminWidget', loader)`.

## Routes (children of /admin/)
`plans`, `plans/new`, `plans/:id/edit`, `plans/categories/new`,
`plans/categories/:id/edit`, `add-ons`, `add-ons/new`, `add-ons/:id/edit`,
`subscriptions`, `subscriptions/create`, `subscriptions/:id`.

## Backend endpoints consumed
`/admin/tarif-plans` (CRUD + archive/activate/copy + subscribers/count),
`/admin/tarif-plan-categories` (CRUD + attach-plans/detach-plans),
`/admin/addons/` (CRUD + activate/deactivate),
`/admin/subscriptions` (list/detail/create + cancel/refund/extend/plan).

## Tests
- unit: `tests/unit/` (views, injected components, stores).
- run: `npm run test`; gate `npm run lint` + `bin/pre-commit-check.sh --full`.
- e2e (admin app 8081): seed BOTH `admin_token` AND `admin_token_user` in
  localStorage; the navbar is dropdown-grouped (flat `nav-*` testids are gone) —
  navigate by URL.

## Gotchas
- `plugins/` is gitignored in the fe-admin core repo; this plugin is its own repo.
- This plugin uses `src/`, not the plugin-id dir (unlike backend/fe-user).
- Permission keys are the **admin** set: `subscription.plans.{view,manage}`,
  `subscription.addons.manage`, `subscription.subscriptions.{view,manage}`.
