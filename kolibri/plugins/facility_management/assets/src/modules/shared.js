export function SET_MODAL(state, modalName) {
  state.modalShown = modalName;
}

export function SET_BUSY(state, isBusy) {
  state.isBusy = isBusy;
}

export function SET_ERROR(state, error) {
  state.error = error;
}

export function displayModal(store, modalName) {
  store.commit('SET_MODAL', modalName);
  store.commit('SET_ERROR', '');
  store.commit('SET_BUSY', false);
}
