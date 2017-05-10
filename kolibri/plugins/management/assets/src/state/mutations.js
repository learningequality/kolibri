const sumBy = require('lodash/sumBy');

// TODO move more mutations here so they can be tested

function CONFIG_PAGE_NOTIFY(state, notificationType) {
  state.pageState.notification = notificationType;
}

function CONFIG_PAGE_UNDO_SETTINGS_CHANGE(state) {
  state.pageState.settings = Object.assign({}, state.pageState.settingsCopy);
}

function CONFIG_PAGE_MODIFY_SETTING(state, { name, value }) {
  if (state.pageState.settings[name] !== undefined) {
    state.pageState.settings[name] = value;
  }
}

function CONFIG_PAGE_MODIFY_ALL_SETTINGS(state, settings) {
  state.pageState.settings = Object.assign({}, settings);
}

// this is basically the inverse of undo settings...
function CONFIG_PAGE_COPY_SETTINGS(state) {
  state.pageState.settingsCopy = Object.assign({}, state.pageState.settings);
}

function CONTENT_MGMT_UPDATE_CHANNEL_INFO(state, { channelId, files }) {
  state.pageState.channelInfo[channelId] = {
    numberOfFiles: files.length,
    totalFileSizeInBytes: sumBy(files, 'file_size'),
  };
}

function SET_CONTENT_PAGE_WIZARD_STATE(state, wizardState) {
  state.pageState.wizardState = wizardState;
}

module.exports = {
  CONFIG_PAGE_NOTIFY,
  CONFIG_PAGE_UNDO_SETTINGS_CHANGE,
  CONFIG_PAGE_MODIFY_SETTING,
  CONFIG_PAGE_MODIFY_ALL_SETTINGS,
  CONFIG_PAGE_COPY_SETTINGS,
  CONTENT_MGMT_UPDATE_CHANNEL_INFO,
  SET_CONTENT_PAGE_WIZARD_STATE,
};
