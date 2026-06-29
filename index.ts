import type { IPlugin, IPlatformSDK } from 'vbwd-view-component';
import { defineAsyncComponent } from 'vue';
import { extensionRegistry } from '../../vue/src/plugins/extensionRegistry';
import en from './locales/en.json';
import de from './locales/de.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import ja from './locales/ja.json';
import ru from './locales/ru.json';
import th from './locales/th.json';
import zh from './locales/zh.json';

export const subscriptionAdminPlugin: IPlugin = {
  name: 'subscription-admin',
  version: '1.0.0',
  dependencies: ['cms-admin'],
  description: 'Subscription management — plans, subscriptions, add-ons, categories',

  install(sdk: IPlatformSDK) {
    // Translations: the `subscriptionAdmin` namespace (TariffPlanCollection
    // widget editor) plus the `subscription` namespace (dashboard widget).
    sdk.addTranslations('en', en as Record<string, unknown>);
    sdk.addTranslations('de', de as Record<string, unknown>);
    sdk.addTranslations('es', es as Record<string, unknown>);
    sdk.addTranslations('fr', fr as Record<string, unknown>);
    sdk.addTranslations('ja', ja as Record<string, unknown>);
    sdk.addTranslations('ru', ru as Record<string, unknown>);
    sdk.addTranslations('th', th as Record<string, unknown>);
    sdk.addTranslations('zh', zh as Record<string, unknown>);

    // Register the TariffPlanCollection editor through the SHARED cms-admin
    // widget-editor seam (OCP). Dynamic import keeps cms-admin a soft
    // dependency — if cms-admin is absent the widget editor is simply not
    // registered.
    import('../cms-admin/index')
      .then(({ registerWidgetEditor }) => {
        import('./src/widgets/registerTariffPlanCollectionWidgetEditor').then(
          ({ registerTariffPlanCollectionWidgetEditor }) => {
            registerTariffPlanCollectionWidgetEditor(registerWidgetEditor);
          },
        );
      })
      .catch(() => {
        // cms-admin plugin not installed — skip widget-editor registration.
      });

    // Routes — injected as children of /admin/
    sdk.addRoute({
      path: 'plans',
      name: 'plans',
      component: () => import('./src/views/Plans.vue'),
      meta: { requiredPermission: 'subscription.plans.view', title: 'Plan Management' },
    });
    sdk.addRoute({
      path: 'plans/new',
      name: 'plan-new',
      component: () => import('./src/views/PlanForm.vue'),
      meta: { requiredPermission: 'subscription.plans.manage' },
    });
    sdk.addRoute({
      path: 'plans/:id/edit',
      name: 'plan-edit',
      component: () => import('./src/views/PlanForm.vue'),
      meta: { requiredPermission: 'subscription.plans.view' },
    });
    sdk.addRoute({
      path: 'plans/categories/new',
      name: 'category-new',
      component: () => import('./src/views/CategoryForm.vue'),
      meta: { requiredPermission: 'subscription.plans.manage' },
    });
    sdk.addRoute({
      path: 'plans/categories/:id/edit',
      name: 'category-edit',
      component: () => import('./src/views/CategoryForm.vue'),
      meta: { requiredPermission: 'subscription.plans.manage' },
    });
    sdk.addRoute({
      path: 'add-ons',
      name: 'add-ons',
      component: () => import('./src/views/AddOns.vue'),
      meta: { requiredPermission: 'subscription.addons.manage' },
    });
    sdk.addRoute({
      path: 'add-ons/new',
      name: 'addon-new',
      component: () => import('./src/views/AddonForm.vue'),
      meta: { requiredPermission: 'subscription.addons.manage' },
    });
    sdk.addRoute({
      path: 'add-ons/:id/edit',
      name: 'addon-edit',
      component: () => import('./src/views/AddonForm.vue'),
      meta: { requiredPermission: 'subscription.addons.manage' },
    });
    sdk.addRoute({
      path: 'subscriptions',
      name: 'subscriptions',
      component: () => import('./src/views/Subscriptions.vue'),
      meta: { requiredPermission: 'subscription.subscriptions.view', title: 'Subscriptions' },
    });
    sdk.addRoute({
      path: 'subscriptions/create',
      name: 'subscription-create',
      component: () => import('./src/views/SubscriptionCreate.vue'),
      meta: { requiredPermission: 'subscription.subscriptions.manage' },
    });
    sdk.addRoute({
      path: 'subscriptions/:id',
      name: 'subscription-details',
      component: () => import('./src/views/SubscriptionDetails.vue'),
      meta: { requiredPermission: 'subscription.subscriptions.view' },
    });

    // Admin dashboard widget — component name "SubscriptionAdminWidget"
    // matches the "subscription-admin" plugin key via Dashboard.vue's
    // normalised-name filter.
    sdk.addComponent(
      'SubscriptionAdminWidget',
      () => import('./src/components/SubscriptionAdminWidget.vue') as Promise<{ default: unknown }>,
    );

    // Routes registered here (install runs once).
    // Nav sections registered in activate() to respect enable/disable.
  },

  activate() {
    extensionRegistry.register('subscription-admin', {
      // Subscription summary block on the core User Details page.
      userDetailsSections: [
        defineAsyncComponent(
          () => import('./src/components/UserSubscriptionSection.vue')
        ),
      ],
      // "Subscription Info" block on the core Invoice Details page.
      invoiceDetailSections: [
        defineAsyncComponent(
          () => import('./src/components/InvoiceSubscriptionSection.vue')
        ),
      ],
      sectionItems: {
        sales: [
          { label: 'Subscriptions', to: '/admin/subscriptions', position: 'before:invoices', requiredPermission: 'subscription.subscriptions.view' },
        ],
      },
      navSections: [
        {
          id: 'tarifs',
          label: 'Tarifs',
          items: [
            { label: 'Plans', to: '/admin/plans', requiredPermission: 'subscription.plans.view' },
            { label: 'Add-Ons', to: '/admin/add-ons', requiredPermission: 'subscription.addons.manage' },
          ],
        },
      ],
      accessLevelFormFields: [
        {
          component: defineAsyncComponent(
            () => import('./src/components/LinkedPlanField.vue')
          ),
          userOnly: true,
          fields: ['linked_plan_slug'],
        },
      ],
      accessLevelUserColumns: [
        {
          id: 'linked-plan',
          header: 'Linked Plan',
          component: defineAsyncComponent(
            () => import('./src/components/LinkedPlanColumn.vue')
          ),
        },
      ],
      userEditTabs: [
        {
          id: 'subscriptions',
          label: 'Subscriptions',
          order: 10,
          component: defineAsyncComponent(
            () => import('./src/components/UserSubscriptionsTab.vue')
          ),
          requiredPermission: 'subscription.subscriptions.view',
        },
        {
          id: 'addons',
          label: 'Add-ons',
          order: 20,
          component: defineAsyncComponent(
            () => import('./src/components/UserAddonsTab.vue')
          ),
          requiredPermission: 'subscription.subscriptions.view',
        },
      ],
    });
  },

  deactivate() {
    extensionRegistry.unregister('subscription-admin');
  },
};

// Default export — loader falls back to scanning named exports when this
// is missing, which is non-deterministic under some bundler hot-reload
// paths. Matches the cms-admin pattern for robustness.
export default subscriptionAdminPlugin;
