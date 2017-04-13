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

module.exports = {
  CONFIG_PAGE_NOTIFY,
  CONFIG_PAGE_UNDO_SETTINGS_CHANGE,
  CONFIG_PAGE_MODIFY_SETTING,
};
