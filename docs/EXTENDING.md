# Subscription Admin Plugin — Extending (fe-admin)

Recipes for changing the admin subscription plugin **without touching the core
admin app**. Read [`ARCHITECTURE.md`](ARCHITECTURE.md) first.

Golden rules:

1. **Never edit `vbwd-fe-admin/vue/src/`** for subscription behaviour. Add routes
   via the SDK; inject into core pages via `extensionRegistry`.
2. **TDD-first.** Add/extend a Vitest unit test before the change.
3. Routes are registered in `install()` (runs once); nav/sections/tabs in
   `activate()` (respects enable/disable) and torn down in `deactivate()`.
4. Run `npm run lint` (full project); `bin/pre-commit-check.sh --full` before done.

---

## Recipe: add an admin view/route

1. Create `src/views/MyView.vue`.
2. In `index.ts` `install()`:
   ```ts
   sdk.addRoute({
     path: 'my-thing',                       // relative → child of /admin/
     name: 'my-thing',
     component: () => import('./src/views/MyView.vue'),
     meta: { requiredPermission: 'subscription.subscriptions.view' },
   });
   ```
3. To add a sidebar entry, extend `navSections` (or `sectionItems`) in
   `activate()`.

## Recipe: inject a block into a core admin page

Add the relevant key to the `AdminExtension` object in `activate()`:

- block on **User Details** → `userDetailsSections: [defineAsyncComponent(...)]`
- block on **Invoice Details** → `invoiceDetailSections: [...]`
- tab on the **user-edit** page → `userEditTabs: [{ id, label, order, component,
  requiredPermission }]`
- field/column on **Access Levels** → `accessLevelFormFields` /
  `accessLevelUserColumns`
- positioned **nav** item → `sectionItems: { <section>: [{ label, to, position,
  requiredPermission }] }` (e.g. `position: 'before:invoices'`)
- standalone **nav** group → `navSections: [{ id, label, items }]`

Create the component under `src/components/` and gate it with the right
`subscription.*` permission. Never add the block by editing the core page.

## Recipe: add a dashboard widget

`sdk.addComponent('MyWidget', () => import('./src/components/MyWidget.vue'))` in
`install()`. The core Dashboard matches the component name to the plugin key via
its normalised-name filter.

## Recipe: add a store action / call a new admin endpoint

Add the action to the relevant options-API store in `src/stores/` using
`api.get/post/put/delete('/admin/...')`. Keep response types explicit. Don't put
admin subscription calls in core stores.

## Recipe: add a config option

Add it to `config.json` (typed default) and a field to `admin-config.json`
(correct tab/component). Keep it aligned with the backend plugin's settings where
they overlap.

## Checklist before "done"

- [ ] Vitest unit test added/updated and green.
- [ ] No core `vue/src/` file touched — only SDK + `extensionRegistry`.
- [ ] `activate()` registers and `deactivate()` unregisters any new extension.
- [ ] `npm run lint` clean; `bin/pre-commit-check.sh --full` green.
