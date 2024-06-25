import { ClassroomResource } from 'kolibri.resources';
import logger from 'kolibri.lib.logging';
import { pageNameToModuleMap } from '../constants';
import { LessonsPageNames } from '../constants/lessonsConstants';
import examReportDetail from './examReportDetail';
import exerciseDetail from './exerciseDetail';
import groups from './groups';
import lessonSummary from './lessonSummary';
import lessonsRoot from './lessonsRoot';
import classSummary from './classSummary';
import coachNotifications from './coachNotifications';
import questionDetail from './questionDetail';
import questionList from './questionList';
import resourceDetail from './resourceDetail';

const logging = logger.getLogger(__filename);

export default {
  state() {
    return {
      dataLoading: false,
      classList: [],
      pageName: '',
      toolbarRoute: {},
      toolbarTitle: '',
    };
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
    SET_DATA_LOADING(state, dataLoading) {
      state.dataLoading = dataLoading;
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
    userIsAuthorizedForCoach(state, getters, rootState) {
      if (getters.isSuperuser) {
        return true;
      } else if (getters.isCoach || getters.isAdmin) {
        return (
          rootState.route.params.facilityId === rootState.core.session.facility_id ||
          !rootState.route.params.facilityId
        );
      }
      return false;
    },
  },
  actions: {
    setClassList(store, facilityId) {
      if (!facilityId) {
        throw new Error("Missing required 'facilityId' argument");
      }
      store.commit('SET_DATA_LOADING', true);
      store.commit('SET_CLASS_LIST', []); // Reset the list if we're loading a new one
      return ClassroomResource.fetchCollection({
        getParams: { parent: facilityId, role: 'coach' },
      })
        .then(classrooms => {
          store.commit('SET_CLASS_LIST', classrooms);
          store.commit('SET_DATA_LOADING', false);
        })
        .catch(error => {
          store.dispatch('handleApiError', { error });
          store.commit('SET_DATA_LOADING', false);
        });
    },
    /**
      * Handle coach page errors.
      * The status code errors that's related to the authentication issue, most not show
        in coach page beacuse there's an `auth-message` that explain the error.
      **/
    handleCoachPageError(store, errorObject) {
      const authErrorCodes = [401, 403, 404, 407];
      logging.error(errorObject);
      if (errorObject.response.status && authErrorCodes.includes(errorObject.response.status)) {
        store.dispatch('handleApiError', { error: '' });
      } else {
        store.dispatch('handleApiError', { error: errorObject, reloadOnReconnect: true });
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
          store
            .dispatch('classSummary/loadClassSummary', classId)
            .then(summary => store.dispatch('setClassList', summary.facility_id)),
          store.dispatch('coachNotifications/fetchNotificationsForClass', classId),
        ]).catch(error => {
          store.dispatch('handleApiError', { error, reloadOnReconnect: true });
        });
      } else {
        // otherwise refresh but don't block
        return store
          .dispatch('classSummary/loadClassSummary', classId)
          .catch(error => store.dispatch('handleApiError', { error }));
      }
    },
  },
  modules: {
    classSummary,
    coachNotifications,
    examReportDetail,
    exerciseDetail,
    groups,
    lessonSummary,
    lessonsRoot,
    questionDetail,
    questionList,
    resourceDetail,
  },
};
