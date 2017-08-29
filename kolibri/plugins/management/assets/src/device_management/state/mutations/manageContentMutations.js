export function SET_CONTENT_PAGE_STATE(state, newPageState) {
  state.pageState = newPageState;
}

export function SET_CONTENT_PAGE_TASKS(state, taskList) {
  state.pageState.taskList = taskList;
}

export function SET_CONTENT_PAGE_CHANNELS(state, channelList) {
  state.pageState.channelList = channelList;
}
