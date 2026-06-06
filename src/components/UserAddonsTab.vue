<template>
  <div
    data-testid="tab-content-addons"
    class="tab-content"
  >
    <div class="tab-filters">
      <input
        v-model="addonSearch"
        type="text"
        data-testid="addons-search-input"
        :placeholder="$t('common.search')"
        class="search-input"
      >
    </div>

    <div
      v-if="addonsLoading"
      class="loading-state"
    >
      <div class="spinner" />
      <p>{{ $t('common.loading') }}</p>
    </div>

    <div
      v-else-if="filteredAddons.length === 0"
      data-testid="addons-empty-state"
      class="empty-state"
    >
      <p>{{ $t('users.noAddonsForUser') }}</p>
    </div>

    <table
      v-else
      data-testid="user-addons-table"
      class="data-table"
    >
      <thead>
        <tr>
          <th>{{ $t('users.addonName') }}</th>
          <th>{{ $t('users.paymentStatus') }}</th>
          <th>{{ $t('common.status') }}</th>
          <th>{{ $t('users.firstInvoice') }}</th>
          <th>{{ $t('users.lastInvoice') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="addon in filteredAddons"
          :key="addon.id"
        >
          <td>{{ addon.addon_name }}</td>
          <td>
            <span
              v-if="addon.invoice_status"
              class="status-badge"
              :class="addon.invoice_status"
            >
              {{ formatInvoiceStatus(addon.invoice_status) }}
            </span>
            <span v-else>-</span>
          </td>
          <td>
            <span
              class="status-badge"
              :class="addon.status.toLowerCase()"
            >
              {{ formatStatus(addon.status) }}
            </span>
          </td>
          <td>
            <a
              v-if="addon.first_invoice"
              class="invoice-link"
              data-testid="first-invoice-link"
              @click="navigateToInvoice(addon.first_invoice.id)"
            >
              {{ formatDate(addon.first_invoice.created_at) }}
            </a>
            <span v-else>-</span>
          </td>
          <td>
            <a
              v-if="addon.last_invoice"
              class="invoice-link"
              data-testid="last-invoice-link"
              @click="navigateToInvoice(addon.last_invoice.id)"
            >
              {{ formatDate(addon.last_invoice.created_at) }}
            </a>
            <span v-else>-</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { api } from '@/api';

/**
 * Add-ons tab on the core User Edit page — contributed by the
 * subscription-admin plugin via `extensionRegistry.userEditTabs`. Add-on
 * subscriptions are a subscription-domain concept, so this lives in the plugin.
 */
const props = defineProps<{
  /** The user being edited */
  userId: string;
  /** Whether this tab is currently shown — used to lazy-load on first view */
  active: boolean;
}>();

const router = useRouter();
const { t } = useI18n();

interface AddonInvoice {
  id: string;
  invoice_number: string;
  created_at: string | null;
}
interface UserAddonSub {
  id: string;
  addon_name: string;
  status: string;
  invoice_status: string | null;
  first_invoice: AddonInvoice | null;
  last_invoice: AddonInvoice | null;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string | null;
}

const addonsLoading = ref(false);
const userAddonSubs = ref<UserAddonSub[]>([]);
const addonSearch = ref('');
const loaded = ref(false);

const filteredAddons = computed(() => {
  if (!addonSearch.value.trim()) {
    return userAddonSubs.value;
  }
  const query = addonSearch.value.toLowerCase();
  return userAddonSubs.value.filter(a =>
    a.addon_name?.toLowerCase().includes(query) ||
    a.status?.toLowerCase().includes(query)
  );
});

async function fetchUserAddons(): Promise<void> {
  addonsLoading.value = true;
  try {
    const response = await api.get(`/admin/subscription/users/${props.userId}/addons`) as { addon_subscriptions: UserAddonSub[] };
    userAddonSubs.value = response.addon_subscriptions || [];
    loaded.value = true;
  } catch {
    // Error handled silently
  } finally {
    addonsLoading.value = false;
  }
}

function navigateToInvoice(invoiceId: string): void {
  router.push(`/admin/invoices/${invoiceId}`);
}

function formatStatus(status: string): string {
  const statusKey = `subscriptions.statuses.${status}`;
  const translated = t(statusKey);
  return translated === statusKey ? status : translated;
}

function formatInvoiceStatus(status: string): string {
  const statusKey = `invoices.statuses.${status}`;
  const translated = t(statusKey);
  return translated === statusKey ? status : translated;
}

function formatDate(dateString?: string | null): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString();
}

// Lazy-load on first activation (mirrors the original switchToAddons guard).
watch(
  () => props.active,
  (isActive) => {
    if (isActive && !loaded.value) {
      fetchUserAddons();
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.tab-content {
  padding: 20px 0;
}

.tab-filters {
  margin-bottom: 20px;
}

.search-input {
  width: 100%;
  max-width: 300px;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.search-input:focus {
  outline: none;
  border-color: #3498db;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 40px;
  color: #666;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.data-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #2c3e50;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-badge.active,
.status-badge.paid {
  background: #d4edda;
  color: #155724;
}

.status-badge.cancelled,
.status-badge.failed {
  background: #f8d7da;
  color: #721c24;
}

.status-badge.past_due,
.status-badge.refunded {
  background: #fff3cd;
  color: #856404;
}

.status-badge.trialing,
.status-badge.pending {
  background: #cce5ff;
  color: #004085;
}

.status-badge.paused,
.status-badge.expired {
  background: #e9ecef;
  color: #495057;
}

.invoice-link {
  color: #3498db;
  cursor: pointer;
  text-decoration: none;
}

.invoice-link:hover {
  text-decoration: underline;
}
</style>
