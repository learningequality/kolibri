export function showManageContentPage(store) {
  store.commit('manageContent/RESET_STATE');
  store.commit('manageContent/wizard/RESET_STATE');
  if (store.getters.canManageContent) {
    return store.dispatch('manageContent/refreshChannelList');
  }
  return Promise.resolve();
}
