# Subscription Admin Plugin — Architecture (fe-admin)

How the admin subscription plugin works and how it injects into the agnostic
`vbwd-fe-admin` core app.

- [1. Agnostic-core contract](#1-agnostic-core-contract)
- [2. Plugin registration (`index.ts`)](#2-plugin-registration-indexts)
- [3. Routes](#3-routes)
- [4. The extension registry (core-page injection)](#4-the-extension-registry-core-page-injection)
- [5. Stores](#5-stores)
- [6. Components](#6-components)
- [7. Config](#7-config)
- [8. Testing](#8-testing)

---

## 1. Agnostic-core contract

The admin core exposes the SDK and an **extension registry**. The plugin reaches
into them; core never imports the plugin.

| Core seam | Module | Used for |
|---|---|---|
| `IPlatformSDK` | `vbwd-view-component` | `addRoute`, `addComponent` |
| `extensionRegistry` | `vue/src/plugins/extensionRegistry` | inject tabs/sections/columns/nav into core pages |

Core admin pages (User Details, Invoice Details, Access Levels, Dashboard) render
plugin-provided extensions generically — they ask the registry "what extensions
apply here?" and never name subscriptions. Removing this plugin removes all
subscription admin UI; the app still runs.

## 2. Plugin registration (`index.ts`)

`subscriptionAdminPlugin: IPlugin`:

- `install(sdk)` — runs once. Registers all `/admin/...` child routes and the
  `SubscriptionAdminWidget` dashboard component (`sdk.addComponent`).
- `activate()` — registers the `AdminExtension` object on `extensionRegistry`
  under key `'subscription-admin'` (respects enable/disable: nav/sections only
  show when the plugin is enabled).
- `deactivate()` — `extensionRegistry.unregister('subscription-admin')`.

> Exports both a named `subscriptionAdminPlugin` and a `default` — the loader can
> be non-deterministic under some hot-reload paths without a default. Matches the
> `cms-admin` pattern.

## 3. Routes

Registered with `sdk.addRoute` as **children of `/admin/`** (relative paths),
each gated by `meta.requiredPermission`:

| Path (under /admin/) | Name | View | Permission |
|---|---|---|---|
| `plans` | `plans` | `Plans.vue` | `subscription.plans.view` |
| `plans/new` | `plan-new` | `PlanForm.vue` | `subscription.plans.manage` |
| `plans/:id/edit` | `plan-edit` | `PlanForm.vue` | `subscription.plans.view` |
| `plans/categories/new` | `category-new` | `CategoryForm.vue` | `subscription.plans.manage` |
| `plans/categories/:id/edit` | `category-edit` | `CategoryForm.vue` | `subscription.plans.manage` |
| `add-ons` | `add-ons` | `AddOns.vue` | `subscription.addons.manage` |
| `add-ons/new` | `addon-new` | `AddonForm.vue` | `subscription.addons.manage` |
| `add-ons/:id/edit` | `addon-edit` | `AddonForm.vue` | `subscription.addons.manage` |
| `subscriptions` | `subscriptions` | `Subscriptions.vue` | `subscription.subscriptions.view` |
| `subscriptions/create` | `subscription-create` | `SubscriptionCreate.vue` | `subscription.subscriptions.manage` |
| `subscriptions/:id` | `subscription-details` | `SubscriptionDetails.vue` | `subscription.subscriptions.view` |

## 4. The extension registry (core-page injection)

`activate()` registers one `AdminExtension` (key `subscription-admin`). The keys
it uses and where each surfaces in core:

| Extension key | Where it renders (core page) | Plugin component / data |
|---|---|---|
| `userDetailsSections` | core **User Details** page | `UserSubscriptionSection.vue` |
| `invoiceDetailSections` | core **Invoice Details** page ("Subscription Info") | `InvoiceSubscriptionSection.vue` |
| `userEditTabs` | core **user-edit** tabs | `UserSubscriptionsTab.vue` (order 10), `UserAddonsTab.vue` (order 20) |
| `accessLevelFormFields` | core **Access Level** form (`userOnly`) | `LinkedPlanField.vue` (field `linked_plan_slug`) |
| `accessLevelUserColumns` | core **Access Level** user table | `LinkedPlanColumn.vue` ("Linked Plan") |
| `sectionItems.sales` | core **Sales** nav section | "Subscriptions" → `/admin/subscriptions` (`before:invoices`) |
| `navSections` | sidebar | "Tarifs" group → Plans + Add-Ons |
| (`sdk.addComponent`) | core **Dashboard** | `SubscriptionAdminWidget` (name matched by normalised plugin key) |

This is the mechanism that keeps core admin pages subscription-agnostic: the
"Subscription Info" block on an invoice, the "Subscriptions"/"Add-ons" tabs on a
user, and the access-level↔plan linkage are all plugin-owned components injected
through the registry — not core code.

`AdminExtension` (core contract) supports:
`userDetailsSections`, `invoiceDetailSections`, `navSections`, `sectionItems`
(positioned nav items, e.g. `before:invoices`), `accessLevelFormFields`,
`accessLevelUserColumns`, `userEditTabs`.

## 5. Stores

Pinia **options-API** stores wrapping the backend admin API:

| Store | id | Endpoints |
|---|---|---|
| `usePlanAdminStore` | `planAdmin` | `/admin/tarif-plans` CRUD + `archive`/`activate`/`copy` + `subscribers/count` |
| `useCategoryAdminStore` | `categoryAdmin` | `/admin/tarif-plan-categories` CRUD + `attach-plans`/`detach-plans` |
| `useAddonStore` | `addons` | `/admin/addons/` CRUD + `activate`/`deactivate` |
| `useSubscriptionsStore` | `subscriptions` | `/admin/subscriptions` list/detail/create + `cancel`/`refund`/`extend`/`plan` |

## 6. Components

`src/components/`:

| Component | Role |
|---|---|
| `SubscriptionAdminWidget.vue` | dashboard summary widget |
| `UserSubscriptionsTab.vue` / `UserAddonsTab.vue` | user-edit tabs |
| `UserSubscriptionSection.vue` | block on User Details |
| `InvoiceSubscriptionSection.vue` | "Subscription Info" on Invoice Details |
| `LinkedPlanField.vue` / `LinkedPlanColumn.vue` | access-level ↔ plan linkage |
| `CategoriesTab.vue` | category management within Plans |

## 7. Config

`config.json` declares typed defaults (`trial_days`, `max_subscriptions_per_user`,
`allow_downgrade`, `proration_enabled`). `admin-config.json` is the Settings UI
schema (General tab). These mirror the backend plugin's operational settings.

## 8. Testing

```bash
cd vbwd-fe-admin
npm run test
```

Unit tests in `tests/unit/` cover views (Plans, PlanForm, Subscriptions,
SubscriptionDetails), the injected components (UserSubscriptionsTab,
UserAddonsTab, UserSubscriptionSection, InvoiceSubscriptionSection), and stores
(addons, subscriptions, addon-form). For e2e, seed BOTH `admin_token` and
`admin_token_user` in localStorage and navigate by URL.

See [`EXTENDING.md`](EXTENDING.md) and [`LLM_GUIDE.md`](LLM_GUIDE.md).
