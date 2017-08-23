import { PageNames } from '../../constants';

export function SET_PERMISSIONS_PAGE_STATE(state, pageState) {
  if (state.pageName === PageNames.DEVICE_PERMISSIONS_MGMT_PAGE) {
    state.pageState = pageState;
  }
}

export function SET_USER_PERMISSIONS_PAGE_STATE(state, pageState) {
  if (state.pageName === PageNames.USER_PERMISSIONS_MGMT_PAGE) {
    state.pageState = pageState;
  }
}
