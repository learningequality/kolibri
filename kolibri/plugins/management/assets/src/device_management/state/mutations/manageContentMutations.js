import { PageNames } from '../../constants';

function isManageContentPage(state) {
  return state.pageName === PageNames.MANAGE_CONTENT_PAGE;
}

export function SET_CONTENT_PAGE_STATE(state, newPageState) {
  if (isManageContentPage(state)) {
    state.pageState = newPageState;
  }
}

export function SET_CONTENT_PAGE_TASKS(state, taskList) {
  if (isManageContentPage(state)) {
    state.pageState.taskList = taskList;
  }
}

export function SET_CONTENT_PAGE_CHANNELS(state, channelList) {
  if (isManageContentPage(state)) {
    state.pageState.channelList = channelList;
  }
}
