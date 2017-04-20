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

  it('CONFIG_PAGE_MODIFY_SETTING if setting is real', () => {
    const mockState = {
      pageState: {
        settings: { setting_1: true, setting_2: false },
      },
    };
    mutations.CONFIG_PAGE_MODIFY_SETTING(mockState, {
      name: 'setting_1', value: false,
    });
    assert.equal(mockState.pageState.settings.setting_1, false);
  });

  it('CONFIG_PAGE_MODIFY_SETTING if setting not real', () => {
    const mockState = {
      pageState: {
        settings: { setting_1: true, setting_2: false },
      },
    };
    mutations.CONFIG_PAGE_MODIFY_SETTING(mockState, {
      name: 'setting_1000', value: false,
    });
    assert.equal(mockState.pageState.settings.setting_1000 === undefined, true);
  });

  it('CONFIG_PAGE_MODIFY_ALL_SETTINGS', () => {
    const mockState = {
      pageState: {
        settings: { setting_1: true, setting_2: false },
      },
    };
    const differentSettings = { andNowFor: 'something completely different' };
    mutations.CONFIG_PAGE_MODIFY_ALL_SETTINGS(mockState, differentSettings);
    assert.deepEqual(mockState.pageState.settings, differentSettings);
  });

  it('CONFIG_PAGE_COPY_SETTINGS', () => {
    const mockState = {
      pageState: {
        settings: { setting_1: true, setting_2: false },
        settingsCopy: { setting_1: true, setting_2: true },
      },
    };
    mutations.CONFIG_PAGE_UNDO_SETTINGS_CHANGE(mockState);
    assert.deepEqual(mockState.pageState.settingsCopy, {
      setting_1: true, setting_2: true,
    });
  });
});

describe('content management mutations', () => {
  it('CONTENT_MGMT_UPDATE_CHANNEL_INFO', () => {
    const mockState = { pageState: { channelInfo: {} } };
    mutations.CONTENT_MGMT_UPDATE_CHANNEL_INFO(mockState, {
      channelId: 'channel_1',
      files: [
        { id: 'file_1', file_size: 100 },
        { id: 'file_2', file_size: 101 },
      ],
    });
    assert.deepEqual(mockState.pageState.channelInfo, {
      channel_1: {
        numberOfFiles: 2,
        totalFileSizeInBytes: 201,
      }
    });
  });
});
