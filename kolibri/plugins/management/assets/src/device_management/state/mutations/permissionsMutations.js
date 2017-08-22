export function SET_PERMISSIONS_PAGE_STATE(state, pageState) {
  if (state.pageName === 'DEVICE_PERMISSIONS_MGMT_PAGE') {
    state.pageState = pageState;
  }
}
