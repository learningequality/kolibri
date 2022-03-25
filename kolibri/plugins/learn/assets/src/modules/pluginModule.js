import { PageNames, ClassesPageNames } from './../constants';
import mutations from './coreLearn/mutations';
import * as getters from './coreLearn/getters';
import * as actions from './coreLearn/actions';
import classAssignments from './classAssignments';
import classes from './classes';
import examReportViewer from './examReportViewer';
import examViewer from './examViewer';
import lessonPlaylist from './lessonPlaylist';
import topicsTree from './topicsTree';

import plugin_data from 'plugin_data';

export default {
  state() {
    return {
      pageName: '',
      rootNodes: [],
      canAccessUnassignedContentSetting: plugin_data.allowLearnerUnassignedResourceAccess,
      allowGuestAccess: plugin_data.allowGuestAccess,
    };
  },
  actions,
  getters: {
    ...getters,
    learnPageLinks() {
      const params = {};
      return {
        HomePage: {
          name: PageNames.HOME,
          params,
        },
        LibraryPage: {
          name: PageNames.LIBRARY,
          params,
        },
        TopicsPage: {
          name: PageNames.TOPICS_TOPIC,
          params,
        },
        TopicsSearchPage: {
          name: PageNames.TOPICS_TOPIC_SEARCH,
          params,
        },
        ContentUnavailablePage: {
          name: PageNames.CONTENT_UNAVAILABLE,
          params,
        },
        BookmarksPage: {
          name: PageNames.BOOKMARKS,
          params,
        },
        ExamPage: id => {
          return {
            name: ClassesPageNames.EXAM_VIWER,
            params: { params, quizId: id },
          };
        },
        ExamReportViewer: {
          name: ClassesPageNames.EXAM_REPORT_VIEWER,
          params,
        },
        AllClassesPage: {
          name: ClassesPageNames.ALL_CLASSES,
          params,
        },
        ClassAssignmentsPage: {
          name: ClassesPageNames.CLASS_ASSIGNMENTS,
          params,
        },
        LessonPlaylistPage: {
          name: ClassesPageNames.LESSON_PLAYLIST,
          params,
        },
      };
    },
  },
  mutations,
  modules: {
    classAssignments,
    classes,
    examReportViewer,
    examViewer,
    lessonPlaylist,
    topicsTree,
  },
};
