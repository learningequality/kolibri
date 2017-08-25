import { PageNames } from '../../constants';

export function SET_PERMISSIONS_PAGE_STATE(state, pageState) {
  if (state.pageName === PageNames.MANAGE_PERMISSIONS_PAGE) {
    state.pageState = pageState;
  }
}

export function SET_USER_PERMISSIONS_PAGE_STATE(state, pageState) {
  if (state.pageName === PageNames.USER_PERMISSIONS_PAGE) {
    state.pageState = pageState;
  }
}
