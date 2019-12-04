import { ClassroomResource } from 'kolibri.resources';
import logger from 'kolibri.lib.logging';
import { pageNameToModuleMap, PageNames } from '../constants';
import { LessonsPageNames } from '../constants/lessonsConstants';
import examCreation from './examCreation';
import examReport from './examReport';
import examReportDetail from './examReportDetail';
import examsRoot from './examsRoot';
import exerciseDetail from './exerciseDetail';
import groups from './groups';
import adHocLearners from './adHocLearners';
import lessonSummary from './lessonSummary';
import lessonsRoot from './lessonsRoot';
import classSummary from './classSummary';
import coachNotifications from './coachNotifications';
import questionDetail from './questionDetail';
import questionList from './questionList';

const logging = logger.getLogger(__filename);

export default {
  state: {
    busy: false,
    classList: [],
    pageName: '',
    toolbarRoute: {},
    toolbarTitle: '',
  },
  mutations: {
    SET_PAGE_NAME(state, pageName) {
      state.pageName = pageName;
    },
    SET_CLASS_LIST(state, classList) {
      state.classList = classList;
    },
    SET_TOOLBAR_TITLE(state, title) {
      state.toolbarTitle = title;
    },
    SET_TOOLBAR_ROUTE(state, toolbarRoute) {
      state.toolbarRoute = toolbarRoute;
    },
  },
  getters: {
    classListPageEnabled(state) {
      // If the number of classes is exactly 1, then redirect to its home page,
      // otherwise show the whole class list
      return state.classList.length !== 1;
    },
    userIsAuthorizedForCoach(state, getters) {
      return getters.isCoach || getters.isAdmin || getters.isSuperuser;
    },
  },
  actions: {
    setClassList(store) {
      return ClassroomResource.fetchCollection({ getParams: { role: 'coach' } })
        .then(classrooms => {
          store.commit('SET_CLASS_LIST', classrooms);
        })
        .catch(error => store.dispatch('handleApiError', error));
    },
    /**
      * Handle coach page errors.
      * The status code errors that's related to the authentication issue, most not show
        in coach page beacuse there's an `auth-message` that explain the error.
      **/
    handleCoachPageError(store, errorObject) {
      const authErrorCodes = [401, 403, 404, 407];
      logging.error(errorObject);
      if (
        errorObject.status &&
        errorObject.status.code &&
        authErrorCodes.includes(errorObject.status.code)
      ) {
        store.dispatch('handleApiError', '');
      } else {
        store.dispatch('handleApiError', errorObject);
      }
    },
    resetModuleState(store, { toRoute, fromRoute }) {
      // If going from Lesson Summary to something other than Resource Selection, reset
      if (
        fromRoute.name === LessonsPageNames.SUMMARY &&
        toRoute.name !== LessonsPageNames.SELECTION_ROOT
      ) {
        return store.dispatch('lessonSummary/resetLessonSummaryState');
      }
      if (toRoute.name === PageNames.EXAMS) {
        return store.dispatch('examCreation/resetExamCreationState');
      }
      const moduleName = pageNameToModuleMap[fromRoute.name];
      if (moduleName) {
        store.commit(`${moduleName}/RESET_STATE`);
      }
    },
    initClassInfo(store, classId) {
      store.dispatch('clearError');
      // only wait around for the results if the class is switching
      if (store.state.classSummary.id !== classId) {
        store.dispatch('loading');
        return Promise.all([
          // Make sure we load any class list data, so that we know
          // whether this user has access to multiple classes or not.
          store.dispatch('setClassList'),
          store.dispatch('classSummary/loadClassSummary', classId),
          store.dispatch('coachNotifications/fetchNotificationsForClass', classId),
        ]).catch(error => {
          store.dispatch('handleError', error);
        });
      } else {
        // otherwise refresh but don't block
        return store
          .dispatch('classSummary/loadClassSummary', classId)
          .catch(error => store.dispatch('handleApiError', error));
      }
    },
  },
  modules: {
    classSummary,
    coachNotifications,
    examCreation,
    examReport,
    examReportDetail,
    examsRoot,
    exerciseDetail,
    groups,
    adHocLearners,
    lessonSummary,
    lessonsRoot,
    questionDetail,
    questionList,
  },
};
