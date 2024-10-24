import { shallowMount, mount } from '@vue/test-utils';

import SyncStatusDisplay from '../SyncStatusDisplay';

function makeWrapper({ propsData } = {}) {
  return mount(SyncStatusDisplay, { propsData });
}

describe('SyncStatusDisplay', () => {
  it('smoke test', () => {
    const wrapper = shallowMount(SyncStatusDisplay);
    expect(wrapper.exists()).toBe(true);
  });

  it('shows a spinner when the sync status is queued or syncing', () => {
    const wrapper = makeWrapper({
      propsData: { syncStatus: 'SYNCING' },
    });
    expect(wrapper.find('[data-test="syncStatusSpinner"]').exists()).toBeTruthy();
  });

  it('shows an icon when this sync is a different status', () => {
    const wrapper = makeWrapper({
      propsData: { syncStatus: 'NOT_CONNECTED' },
    });
    expect(wrapper.find('[data-test="syncStatusIcon"]').exists()).toBeTruthy();
  });

  it('shows text describing the syncing status', () => {
    const wrapper = makeWrapper({
      propsData: { syncStatus: 'SYNCING' },
    });
    expect(wrapper.find('[data-test="syncStatusText"]').exists()).toBeTruthy();
    expect(wrapper.text()).toContain('Syncing');
  });
});
