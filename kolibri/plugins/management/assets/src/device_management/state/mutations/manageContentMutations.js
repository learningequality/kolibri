import { manageContentPageState } from '../wizardState';

export function RESET_MANAGE_CONTENT_PAGESTATE(state) {
  state.pageState = manageContentPageState();
}

export function SET_CONTENT_PAGE_STATE(state, newPageState) {
  state.pageState = newPageState;
}

export function SET_CONTENT_PAGE_TASKS(state, taskList) {
  state.pageState.taskList = taskList;
}

export function SET_CHANNEL_LIST(state, channelList) {
  state.pageState.channelList = channelList;
}
