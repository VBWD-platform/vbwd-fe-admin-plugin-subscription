import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import UserSubscriptionSection from '../../src/components/UserSubscriptionSection.vue';

type TestUser = {
  subscription?: { plan: string | null; status: string | null; expires_at?: string | null };
} | null;

const mountSection = (user: TestUser) =>
  mount(UserSubscriptionSection, {
    props: { user, loading: false, userId: '1' },
    global: { mocks: { $t: (key: string) => key } }
  });

describe('UserSubscriptionSection (plugin)', () => {
  it('renders plan and status when the user has a subscription', () => {
    const wrapper = mountSection({
      subscription: { plan: 'Pro', status: 'active', expires_at: '2026-01-01T10:00:00Z' }
    });
    expect(wrapper.text()).toContain('Pro');
    expect(wrapper.text()).toContain('active');
  });

  it('renders the expiry row when expires_at is present', () => {
    const wrapper = mountSection({
      subscription: { plan: 'Pro', status: 'active', expires_at: '2026-01-01T10:00:00Z' }
    });
    expect(wrapper.text()).toContain('subscriptions.expires');
  });

  it('renders nothing when the user has no subscription', () => {
    const wrapper = mountSection({ });
    expect(wrapper.find('.section').exists()).toBe(false);
  });

  it('renders nothing when user is null', () => {
    const wrapper = mountSection(null);
    expect(wrapper.find('.section').exists()).toBe(false);
  });
});
