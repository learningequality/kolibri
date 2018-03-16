export default function displayModal(store, modalName) {
  store.dispatch('SET_MODAL', modalName);
  store.dispatch('SET_ERROR', '');
  store.dispatch('SET_BUSY', false);
}
