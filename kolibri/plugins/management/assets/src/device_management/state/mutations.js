import { PageNames } from '../constants';

export function SET_PAGE_NAME(state, name) {
  state.pageName = name;
}

export function SET_PAGE_STATE(state, pageState) {
  state.pageState = pageState;
}

export function SET_CONTENT_PAGE_STATE(state, pageState) {
  if (state.pageName === PageNames.DEVICE_CONTENT_MGMT_PAGE) {
    SET_PAGE_STATE(state, pageState);
  }
}
