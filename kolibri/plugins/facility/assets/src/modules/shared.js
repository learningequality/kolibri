export function SET_MODAL(state, modalName) {
  state.modalShown = modalName;
}

export function SET_DATA_LOADING(state, dataLoading) {
  state.dataLoading = dataLoading;
}

export function SET_ERROR(state, error) {
  state.error = error;
}

export function displayModal(store, modalName) {
  store.commit('SET_MODAL', modalName);
  store.commit('SET_ERROR', '');
  store.commit('SET_DATA_LOADING', false);
}
