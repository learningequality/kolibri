// ================================
// COACH ACTIONS

function initializePage(store) {
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  store.dispatch('SET_PAGE_NAME', 'HOME');
}

function showScratchpad(store) {
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  store.dispatch('SET_PAGE_NAME', 'SCRATCHPAD');
}

module.exports = {
  initializePage,
  showScratchpad,
};
