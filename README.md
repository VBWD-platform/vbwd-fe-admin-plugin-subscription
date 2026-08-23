# Subscription Admin Plugin (fe-admin)

The admin/backoffice Vue plugin for subscriptions: **manage plans, plan
categories, add-ons, and subscriptions**, and inject subscription-aware blocks
into core admin pages (User Details, Invoice Details, Access Levels). It is a
plugin for the `vbwd-fe-admin` app and integrates with the agnostic admin core
through the **extension registry** and the SDK — core never names a subscription
concept.

> **Core principle:** *VBWD core is agnostic — only plugins are gnostic.* The
> core admin app (`vue/src/`) has no plan/subscription views or stores. This
> plugin adds routes via the SDK and injects into core pages via
> `extensionRegistry`.

| | |
|---|---|
| **Plugin id** | `subscription-admin` |
| **Export** | named `subscriptionAdminPlugin` **and** default export (loader robustness) |
| **Consumes from core** | `vbwd-view-component` (SDK), `vue/src/plugins/extensionRegistry` |
| **Backend** | [`vbwd-backend/plugins/subscription`](../../../vbwd-backend/plugins/subscription) |
| **User sibling** | [`vbwd-fe-user/plugins/subscription`](../../../vbwd-fe-user/plugins/subscription) |

## Documentation map

| Doc | Audience | Contents |
|---|---|---|
| **README.md** (this file) | everyone | What it is, structure, key concepts |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | humans | Routes, extension points, stores, components |
| [`docs/EXTENDING.md`](docs/EXTENDING.md) | humans | Recipes: add a view, an extension block, a store action |
| [`docs/LLM_GUIDE.md`](docs/LLM_GUIDE.md) | LLMs / agents | Compact file map, contracts, invariants, gotchas |

## What it does

- **Catalog admin**: `/admin/plans` (+ form, categories), `/admin/add-ons`
  (+ form), `/admin/subscriptions` (list, detail, create).
- **Dashboard widget**: `SubscriptionAdminWidget` registered via `sdk.addComponent`.
- **Core-page injections** (via `extensionRegistry`): a Subscriptions tab and an
  Add-ons tab on the user-edit page, a subscription section on User Details, a
  "Subscription Info" block on Invoice Details, an access-level "linked plan"
  field + column, and a "Tarifs" nav section.

## Layout

```
plugins/subscription-admin/
├── index.ts                    # plugin: routes (SDK) + extension registrations
├── config.json                 # config schema (typed defaults)
├── admin-config.json           # admin settings UI schema (General tab)
├── docs/                       # ← you are here
├── tests/unit/                 # Vitest unit tests (views, components, stores)
└── src/
    ├── views/                  # Plans, PlanForm, CategoryForm, AddOns,
    │                           #   AddonForm, Subscriptions, SubscriptionDetails,
    │                           #   SubscriptionCreate
    ├── stores/                 # planAdmin, categoryAdmin, addons, subscriptions
    └── components/             # UserSubscriptionsTab, UserAddonsTab,
                                #   UserSubscriptionSection, InvoiceSubscriptionSection,
                                #   LinkedPlanField, LinkedPlanColumn,
                                #   CategoriesTab, SubscriptionAdminWidget
```

> Note: this admin plugin uses a `src/` source dir (the established fe-admin
> plugin convention), unlike the backend/fe-user plugins which use the plugin id.

## Key concepts

- **Routes** are registered in `index.ts` `install()` as children of `/admin/`
  (relative paths like `plans`, `add-ons/:id/edit`), each gated by
  `meta.requiredPermission` (`subscription.plans.*`, `subscription.addons.manage`,
  `subscription.subscriptions.*`).
- **Extension registry** is registered in `activate()` and unregistered in
  `deactivate()`. It is how the plugin adds blocks/columns/tabs/nav to *core*
  admin pages without core importing the plugin.
- **Stores** (Pinia options API): `usePlanAdminStore` (`planAdmin`),
  `useCategoryAdminStore` (`categoryAdmin`), `useAddonStore` (`addons`),
  `useSubscriptionsStore` (`subscriptions`) — each wraps the backend
  `/api/v1/admin/...` endpoints.

## Develop

```bash
cd vbwd-fe-admin
npm run test                    # Vitest unit tests
npm run lint                    # ESLint (always full project)
# e2e (admin app on 8081): seed BOTH admin_token AND admin_token_user in localStorage
E2E_BASE_URL=http://localhost:8081 npx playwright test
```

## Engineering requirements (binding)

TDD-first · SOLID · DRY · clean code · **no overengineering**. Gate:
`bin/pre-commit-check.sh --full` green on the repo.

## Documentation

Full platform documentation lives at **[vbwd.cc/docs](https://vbwd.cc/docs)**.

- [Frontend plugins](https://vbwd.cc/docs-frontend-plugins) — how fe-admin / fe-user plugins are built and mounted
- [Subscriptions](https://vbwd.cc/docs-core-subscription) — documentation for this plugin's domain
- [Architecture](https://vbwd.cc/docs-architecture) — platform layering and the core-agnosticism rule
- [Getting started](https://vbwd.cc/docs-getting-started) — install a VBWD instance and enable plugins
