export function SET_CONTENT_PAGE_STATE(state, newPageState) {
  state.pageState = newPageState;
}

export function SET_CONTENT_PAGE_TASKS(state, taskList) {
  state.pageState.taskList = taskList;
}

export function SET_CONTENT_PAGE_CHANNELS(state, channelList) {
  state.pageState.channelList = channelList;
}

export const MutationTypes = {
  [SET_CONTENT_PAGE_STATE]: SET_CONTENT_PAGE_STATE.name,
  [SET_CONTENT_PAGE_TASKS]: SET_CONTENT_PAGE_STATE.name,
  [SET_CONTENT_PAGE_CHANNELS]: SET_CONTENT_PAGE_STATE.name,
};
