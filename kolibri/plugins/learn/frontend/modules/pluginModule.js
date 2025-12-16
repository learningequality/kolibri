// import { LastPages } from './../constants/lastPagesConstants';
import plugin_data from 'kolibri-plugin-data';
import mutations from './coreLearn/mutations';
import * as getters from './coreLearn/getters';
import * as actions from './coreLearn/actions';
import classAssignments from './classAssignments';
import classes from './classes';
import examReportViewer from './examReportViewer';
import examViewer from './examViewer';
import lessonPlaylist from './lessonPlaylist';

export default {
  state() {
    return {
      pageName: '',
      welcomeModalVisible: false,
      canAccessUnassignedContentSetting: plugin_data.allowLearnerUnassignedResourceAccess,
      allowGuestAccess: plugin_data.allowGuestAccess,
      /**
       * Used as a Learn-global state to allow communication about whether this modal is shown
       * or not at any time. It should be set as `false` whenever the content page is loaded.
       **/
      showCompleteContentModal: false,
    };
  },
  actions,
  getters,
  mutations,
  modules: {
    classAssignments,
    classes,
    examReportViewer,
    examViewer,
    lessonPlaylist,
  },
};
