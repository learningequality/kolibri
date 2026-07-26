import { get } from '@vueuse/core';
import useUser from 'kolibri/composables/useUser';
import redirectBrowser from 'kolibri/utils/redirectBrowser';
import router from 'kolibri/router';
import ChannelResource from 'kolibri-common/apiResources/ChannelResource';
import KolibriApp from 'kolibri-app';
import { handleApiError } from 'kolibri/utils/appError';
import useSnackbar from 'kolibri/composables/useSnackbar';
import useFacilities from 'kolibri-common/composables/useFacilities';
import useFacility from 'kolibri-common/composables/useFacility';
import { pageLoading } from 'kolibri-common/composables/usePageLoading';
import { PageNames } from './constants';
import routes from './routes';
import store from './store';
import HomeActivityPage from './views/home/HomeActivityPage';

const { fetchFacilities, facilities } = useFacilities();
const { fetchFacilityConfig } = useFacility();

function _channelListState(data) {
  return data.map(channel => ({
    id: channel.id,
    title: channel.name,
    description: channel.description,
    tagline: channel.tagline,
    root_id: channel.root,
    last_updated: channel.last_updated,
    version: channel.version,
    thumbnail: channel.thumbnail,
    num_coach_contents: channel.num_coach_contents,
  }));
}

function setChannelInfo() {
  return ChannelResource.fetchCollection({ getParams: { available: true } }).then(
    channelsData => {
      store.commit('SET_CHANNEL_LIST', _channelListState(channelsData));
    },
    error => handleApiError({ error }),
  );
}

class CoachToolsModule extends KolibriApp {
  get routes() {
    return routes;
  }
  get RootVue() {
    return { ...super.RootVue, store };
  }
  startRootVue() {
    // Route handlers read the channel list and the facility config, so both have to be
    // resolved before the router handles the first navigation. `handleApiError` re-throws
    // after setting the global error, so swallow the rejections rather than letting a
    // failed fetch stop the app from mounting.
    return Promise.all([
      setChannelInfo().catch(() => {}),
      fetchFacilityConfig().catch(() => {}),
    ]).then(() => super.startRootVue());
  }
  ready() {
    const { snackbarIsVisible, clearSnackbar } = useSnackbar();
    const { isLearnerOnlyImport, isSuperuser } = useUser();
    router.beforeEach((to, from, next) => {
      if (get(isLearnerOnlyImport)) {
        redirectBrowser();
        return;
      }

      const skipLoading = [
        PageNames.EXAM_CREATION_ROOT,
        PageNames.QUIZ_SECTION_EDITOR,
        PageNames.QUIZ_SELECT_PRACTICE_QUIZ,
        PageNames.QUIZ_SELECT_RESOURCES,
        PageNames.QUIZ_SELECT_RESOURCES_INDEX,
        PageNames.QUIZ_SELECT_RESOURCES_BOOKMARKS,
        PageNames.QUIZ_SELECT_RESOURCES_TOPIC_TREE,
        PageNames.QUIZ_PREVIEW_SELECTED_RESOURCES,
        PageNames.QUIZ_SELECT_RESOURCES_SETTINGS,
        PageNames.QUIZ_SELECT_RESOURCES_SEARCH,
        PageNames.QUIZ_SELECT_RESOURCES_SEARCH_RESULTS,
        PageNames.QUIZ_PREVIEW_RESOURCE,
        PageNames.QUIZ_SELECT_RESOURCES_LANDING_SETTINGS,
        PageNames.QUIZ_SECTION_ORDER,
        PageNames.QUIZ_BOOK_MARKED_RESOURCES,
        PageNames.QUIZ_PREVIEW_SELECTED_QUESTIONS,
        PageNames.QUIZ_LEARNER_REPORT,
        PageNames.LESSON_SUMMARY,
        PageNames.LESSON_SELECT_RESOURCES,
        PageNames.LESSON_SELECT_RESOURCES_PREVIEW_SELECTION,
        PageNames.LESSON_SELECT_RESOURCES_PREVIEW_RESOURCE,
        PageNames.LESSON_SELECT_RESOURCES_INDEX,
        PageNames.LESSON_SELECT_RESOURCES_SEARCH,
        PageNames.LESSON_SELECT_RESOURCES_SEARCH_RESULTS,
        PageNames.LESSON_SELECT_RESOURCES_BOOKMARKS,
        PageNames.LESSON_SELECT_RESOURCES_TOPIC_TREE,
        PageNames.COURSES_ROOT,
        PageNames.COURSE_SUMMARY,
        PageNames.COURSE_SUMMARY_UNITS,
        PageNames.COURSE_SUMMARY_LEARNERS,
        PageNames.COURSE_SUMMARY_LEARNER,
        PageNames.COURSE_SUMMARY_OBJECTIVES,
        PageNames.COURSE_SUMMARY_OBJECTIVE,
        PageNames.COURSES_ASSIGN,
        PageNames.COURSES_ASSIGN_INDEX,
        PageNames.COURSES_ASSIGN_COURSE_DETAILS,
        PageNames.COURSES_ASSIGN_SELECT_RECIPIENTS,
        PageNames.COURSE_SUMMARY_ASSIGN,
        PageNames.COURSE_SUMMARY_ASSIGN_COURSE_DETAILS,
        PageNames.COURSE_SUMMARY_ASSIGN_SELECT_RECIPIENTS,
        PageNames.UNIT_DETAIL,
        PageNames.UNIT_DETAIL_LESSONS,
        PageNames.UNIT_DETAIL_OBJECTIVES,
        PageNames.ATTENDANCE_NEW,
        PageNames.ATTENDANCE_HISTORY,
        PageNames.ATTENDANCE_EDIT,
        HomeActivityPage.name,
      ];

      // If we're navigating to the same page for a quiz summary page, don't set loading
      if (
        !skipLoading.includes(to.name) &&
        !(to.params.quizId && from.params.quizId && to.name === from.name)
      ) {
        pageLoading.value = true;
      }
      const promises = [];

      // Clear the snackbar at every navigation to prevent it from re-appearing
      // when the next page component mounts.
      if (get(snackbarIsVisible) && !skipLoading.includes(to.name)) {
        clearSnackbar();
      }

      store.commit('SET_PAGE_NAME', to.name);
      if (
        to.name &&
        !to.params.classId &&
        !['CoachClassListPage', 'StatusTestPage', 'CoachPrompts', 'AllFacilitiesPage'].includes(
          to.name,
        )
      ) {
        store.dispatch('coachNotifications/stopPolling');
      }
      // temporary condition as we're gradually moving all promises below this line to local page handlers and therefore need to skip those that we already refactored here https://github.com/learningequality/kolibri/issues/11219
      if (
        to.name &&
        [
          PageNames.EXAMS_ROOT,
          PageNames.EXAM_CREATION_ROOT,
          PageNames.LESSONS_ROOT,
          PageNames.LESSON_CREATION_ROOT,
          PageNames.LESSON_SUMMARY,
          PageNames.LESSON_EDIT_DETAILS,
          PageNames.RESOURCE_CONTENT_PREVIEW,
          PageNames.GROUP_SUMMARY,
          PageNames.GROUP_ENROLL,
          PageNames.GROUPS_ROOT,
          PageNames.HOME_PAGE,
          PageNames.LESSON_SELECT_RESOURCES,
          PageNames.LESSON_SELECT_RESOURCES_PREVIEW_SELECTION,
          PageNames.LESSON_SELECT_RESOURCES_PREVIEW_RESOURCE,
          PageNames.LESSON_SELECT_RESOURCES_INDEX,
          PageNames.LESSON_SELECT_RESOURCES_SEARCH,
          PageNames.LESSON_SELECT_RESOURCES_SEARCH_RESULTS,
          PageNames.LESSON_SELECT_RESOURCES_BOOKMARKS,
          PageNames.LESSON_SELECT_RESOURCES_TOPIC_TREE,
          PageNames.QUIZ_SELECT_RESOURCES,
          PageNames.QUIZ_SELECT_RESOURCES_INDEX,
          PageNames.QUIZ_SELECT_RESOURCES_BOOKMARKS,
          PageNames.QUIZ_SELECT_RESOURCES_TOPIC_TREE,
          PageNames.QUIZ_PREVIEW_SELECTED_RESOURCES,
          PageNames.QUIZ_PREVIEW_SELECTED_QUESTIONS,
          PageNames.QUIZ_SELECT_RESOURCES_SETTINGS,
          PageNames.QUIZ_SELECT_RESOURCES_SEARCH,
          PageNames.QUIZ_SELECT_RESOURCES_SEARCH_RESULTS,
          PageNames.QUIZ_PREVIEW_RESOURCE,
          PageNames.QUIZ_SELECT_RESOURCES_LANDING_SETTINGS,
          PageNames.COURSES_ROOT,
          PageNames.COURSES_ASSIGN,
          PageNames.COURSES_ASSIGN_INDEX,
          PageNames.COURSES_ASSIGN_COURSE_DETAILS,
          PageNames.COURSES_ASSIGN_SELECT_RECIPIENTS,
          PageNames.COURSE_SUMMARY_ASSIGN,
          PageNames.COURSE_SUMMARY_ASSIGN_COURSE_DETAILS,
          PageNames.COURSE_SUMMARY_ASSIGN_SELECT_RECIPIENTS,
          HomeActivityPage.name,
        ].includes(to.name)
      ) {
        next();
        return;
      }

      if (
        to.name &&
        to.params.classId &&
        !['CoachClassListPage', 'StatusTestPage', 'CoachPrompts', 'AllFacilitiesPage'].includes(
          to.name,
        )
      ) {
        promises.push(store.dispatch('initClassInfo', to.params.classId));
      }

      if (get(isSuperuser) && facilities.value.length === 0) {
        promises.push(fetchFacilities().catch(() => {}));
      }

      if (promises.length > 0) {
        Promise.all(promises)
          .catch(error => {
            handleApiError({ error });
          })
          .catch(() => {
            // We catch here because `handleApiError` throws the error back again, in this case,
            // we just want things to keep moving so that the AuthMessage shows as expected
            next();
          })
          .then(next);
      } else {
        next();
      }
    });

    router.afterEach((toRoute, fromRoute) => {
      store.dispatch('resetModuleState', { toRoute, fromRoute });
    });
    super.ready();
  }
}

export default new CoachToolsModule();
