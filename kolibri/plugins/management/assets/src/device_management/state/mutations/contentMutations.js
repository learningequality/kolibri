import Vue from 'kolibri.lib.vue';
import { PageNames } from '../../constants';

function isManageContentPage(state) {
  return state.pageName === PageNames.MANAGE_CONTENT_PAGE;
}

export function SET_CONTENT_PAGE_STATE(state, newPageState) {
  if (isManageContentPage(state)) {
    state.pageState = newPageState;
  }
}

export function ADD_CHANNEL_FILE_SUMMARY(state, fileSummary) {
  if (isManageContentPage(state)) {
    state.pageState.channelFileSummaries[fileSummary.channel_id] = {
      totalFileSizeInBytes: fileSummary.total_file_size,
      numberOfFiles: fileSummary.total_files,
    };
  }
}

export function REMOVE_CHANNEL_FILE_SUMMARY(state, channelId) {
  if (isManageContentPage(state)) {
    Vue.delete(state.pageState.channelFileSummaries, channelId);
  }
}
