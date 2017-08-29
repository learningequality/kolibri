import { PageNames } from '../../constants';

function isManageContentPage(state) {
  return state.pageName === PageNames.MANAGE_CONTENT_PAGE;
}

export function SET_CONTENT_PAGE_STATE(state, newPageState) {
  if (isManageContentPage(state)) {
    state.pageState = newPageState;
  }
}
