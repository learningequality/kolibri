import { PageNames } from '../constants';

export const mutationTypes = {
  ADD_CHANNEL_FILE_SUMMARY: 'MANAGE_CONTENT_ADD_CHANNEL_FILE_SUMMARY',
};

function isManageContentPage(state) {
  return state.pageName === PageNames.CONTENT_MGMT_PAGE;
}

const mutations = {
  MANAGE_CONTENT_ADD_CHANNEL_FILE_SUMMARY: (state, fileSummary) => {
    if (isManageContentPage(state)) {
      state.pageState.channelFileSummaries[fileSummary.channel_id] = {
        totalFileSizeInBytes: fileSummary.total_file_size,
        numberOfFiles: fileSummary.total_files,
      };
    }
  },
};

export { mutations as default };
