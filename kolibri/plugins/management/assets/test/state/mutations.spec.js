/* eslint-env mocha */
const assert = require('assert');
const mutations = require('../../src/state/mutations');

describe('facility config page mutations', () => {
  it('CONFIG_PAGE_NOTIFY', () => {
    const mockState = { pageState: { notification: 'foofoo' } };
    mutations.CONFIG_PAGE_NOTIFY(mockState, 'barbar');
    assert.equal(mockState.pageState.notification, 'barbar');
  });

  it('CONFIG_PAGE_UNDO_SETTINGS_CHANGE', () => {
    const mockState = {
      pageState: {
        settings: { setting_1: true, setting_2: false },
        settingsCopy: { setting_1: true, setting_2: true },
      },
    };
    mutations.CONFIG_PAGE_UNDO_SETTINGS_CHANGE(mockState);
    assert.deepEqual(mockState.pageState.settings, {
      setting_1: true, setting_2: true,
    });
  });
});
