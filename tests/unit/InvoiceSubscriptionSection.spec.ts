import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import InvoiceSubscriptionSection from '../../src/components/InvoiceSubscriptionSection.vue';

type TestInvoice = {
  subscription_status?: string;
  subscription_start_date?: string;
  subscription_end_date?: string;
  subscription_is_trial?: boolean;
  subscription_trial_end?: string;
} | null;

const mountSection = (invoice: TestInvoice) =>
  mount(InvoiceSubscriptionSection, {
    props: { invoice },
    global: { mocks: { $t: (key: string) => key } }
  });

describe('InvoiceSubscriptionSection (plugin)', () => {
  it('renders the subscription status when present', () => {
    const wrapper = mountSection({
      subscription_status: 'ACTIVE',
      subscription_start_date: '2026-01-01T10:00:00Z'
    });
    expect(wrapper.find('[data-testid="subscription-info"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('ACTIVE');
  });

  it('renders nothing when the invoice has no subscription metadata', () => {
    const wrapper = mountSection({});
    expect(wrapper.find('[data-testid="subscription-info"]').exists()).toBe(false);
  });

  it('renders nothing when invoice is null', () => {
    const wrapper = mountSection(null);
    expect(wrapper.find('[data-testid="subscription-info"]').exists()).toBe(false);
  });
});
