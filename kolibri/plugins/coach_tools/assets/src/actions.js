// ================================
// COACH ACTIONS

function initializePage(store) {
  store.dispatch('CORE_SET_PAGE_LOADING', false);
}

function showScratchpad(store) {
  store.dispatch('CORE_SET_PAGE_LOADING', false);
}

module.exports = {
  initializePage,
  showScratchpad,
};
