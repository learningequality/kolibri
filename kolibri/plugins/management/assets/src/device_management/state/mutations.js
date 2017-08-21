function SET_PAGE_NAME(state, name) {
  state.pageName = name;
}

function SET_PAGE_STATE(state, pageState) {
  state.pageState = pageState;
}

export default {
  SET_PAGE_NAME,
  SET_PAGE_STATE,
}
