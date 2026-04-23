import type { IPlugin, IPlatformSDK } from 'vbwd-view-component';
import { defineAsyncComponent } from 'vue';
import { extensionRegistry } from '../../vue/src/plugins/extensionRegistry';

export const subscriptionAdminPlugin: IPlugin = {
  name: 'subscription-admin',
  version: '1.0.0',
  description: 'Subscription management — plans, subscriptions, add-ons, categories',

  install(sdk: IPlatformSDK) {
    // Routes — injected as children of /admin/
    sdk.addRoute({
      path: 'plans',
      name: 'plans',
      component: () => import('./src/views/Plans.vue'),
      meta: { requiredPermission: 'subscription.plans.view' },
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
      meta: { requiredPermission: 'subscription.subscriptions.view' },
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
