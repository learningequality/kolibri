export default function displayModal(store, modalName) {
  store.commit('SET_MODAL', modalName);
  store.commit('SET_ERROR', '');
  store.commit('SET_BUSY', false);
}
