import ClassroomResource from 'kolibri-common/apiResources/ClassroomResource';
import logger from 'kolibri-logging';
import useUser from 'kolibri/composables/useUser';
import { handleApiError, clearError } from 'kolibri/utils/appError';
import { get } from '@vueuse/core';
import { getReactiveRoute } from 'kolibri/router';
import { pageLoading } from 'kolibri-common/composables/usePageLoading';
import { PageNames, pageNameToModuleMap } from '../constants';
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
      channels: {
        list: [],
        currentId: null,
      },
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
    SET_CHANNEL_LIST(state, channelList) {
      state.channels.list = channelList;
    },
  },
  getters: {
    classListPageEnabled(state) {
      // If the number of classes is exactly 1, then redirect to its home page,
      // otherwise show the whole class list
      return state.classList.length !== 1;
    },
    userIsAuthorizedForCoach() {
      const { isAdmin, isSuperuser, isCoach, userFacilityId } = useUser();
      if (get(isSuperuser)) {
        return true;
      } else if (get(isCoach) || get(isAdmin)) {
        const routeParams = getReactiveRoute().params || {};
        return routeParams.facilityId === get(userFacilityId) || !routeParams.facilityId;
      }
      return false;
    },
    getChannels(state) {
      return state.channels.list;
    },
    getChannelObject(state, getters) {
      return function getter(channelId) {
        return getters.getChannels(state).find(channel => channel.id === channelId);
      };
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
          handleApiError({ error });
          store.commit('SET_DATA_LOADING', false);
        });
    },
    /**
     * Handle coach page errors.
     * The status code errors that's related to the authentication issue, most not show
       in coach page beacuse there's an `auth-message` that explain the error.
     * @param {object} store - The Vuex store action context.
     * @param {object} errorObject - The error caught from a failed coach page request.
     */
    handleCoachPageError(store, errorObject) {
      const authErrorCodes = [401, 403, 404, 407];
      logging.error(errorObject);
      if (errorObject.response.status && authErrorCodes.includes(errorObject.response.status)) {
        handleApiError({ error: '' });
      } else {
        handleApiError({ error: errorObject, reloadOnReconnect: true });
      }
    },
    resetModuleState(store, { toRoute, fromRoute }) {
      // If going from Lesson Summary to something other than Resource Selection, reset
      if (
        fromRoute.name === PageNames.LESSON_SUMMARY &&
        PageNames.LESSON_SUMMARY !== toRoute.name &&
        !toRoute.name.startsWith(PageNames.LESSON_SELECT_RESOURCES)
      ) {
        return store.dispatch('lessonSummary/resetLessonSummaryState');
      }
      const moduleName = pageNameToModuleMap[fromRoute.name];
      if (moduleName) {
        store.commit(`${moduleName}/RESET_STATE`);
      }
    },
    initClassInfo(store, classId) {
      clearError();
      // only wait around for the results if the class is switching
      if (store.state.classSummary.id !== classId) {
        pageLoading.value = true;
        return Promise.all([
          // Make sure we load any class list data, so that we know
          // whether this user has access to multiple classes or not.
          store.dispatch('classSummary/loadClassSummary', classId).then(summary => {
            if (summary?.facility_id) {
              store.dispatch('setClassList', summary?.facility_id);
            }
          }),
          store.dispatch('coachNotifications/fetchNotificationsForClass', classId),
        ]).catch(error => {
          pageLoading.value = false;
          handleApiError({ error, reloadOnReconnect: true });
        });
      } else {
        // otherwise refresh but don't block
        return store
          .dispatch('classSummary/loadClassSummary', classId)
          .catch(error => handleApiError({ error }));
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
