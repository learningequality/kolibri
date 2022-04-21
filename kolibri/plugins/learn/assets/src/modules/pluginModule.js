// import { LastPages } from './../constants/lastPagesConstants';
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
      return {
        HomePage: {
          name: PageNames.HOME,
        },
        LibraryPage: {
          name: PageNames.LIBRARY,
        },
        TopicsPage: {
          name: PageNames.TOPICS_TOPIC,
        },
        TopicsSearchPage: {
          name: PageNames.TOPICS_TOPIC_SEARCH,
        },
        ContentUnavailablePage: {
          name: PageNames.CONTENT_UNAVAILABLE,
        },
        BookmarksPage: {
          name: PageNames.BOOKMARKS,
        },
        ExamPage: id => {
          return {
            name: ClassesPageNames.EXAM_VIWER,
            params: { quizId: id },
          };
        },
        ExamReportViewer: {
          name: ClassesPageNames.EXAM_REPORT_VIEWER,
        },
        AllClassesPage: {
          name: ClassesPageNames.ALL_CLASSES,
        },
        ClassAssignmentsPage: {
          name: ClassesPageNames.CLASS_ASSIGNMENTS,
        },
        LessonPlaylistPage: {
          name: ClassesPageNames.LESSON_PLAYLIST,
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
