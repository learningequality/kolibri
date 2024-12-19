import { get } from '@vueuse/core';
import useUser from 'kolibri/composables/useUser';
import redirectBrowser from 'kolibri/utils/redirectBrowser';
import router from 'kolibri/router';
import ChannelResource from 'kolibri-common/apiResources/ChannelResource';
import KolibriApp from 'kolibri-app';
import useSnackbar from 'kolibri/composables/useSnackbar';
import { PageNames } from './constants';
import routes from './routes';
import pluginModule from './modules/pluginModule';
import HomeActivityPage from './views/home/HomeActivityPage';

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

export function setChannelInfo(store) {
  return ChannelResource.fetchCollection({ getParams: { available: true } }).then(
    channelsData => {
      store.commit('SET_CHANNEL_LIST', _channelListState(channelsData));
      return channelsData;
    },
    error => {
      store.dispatch('handleApiError', { error });
      return error;
    },
  );
}

class CoachToolsModule extends KolibriApp {
  get stateSetters() {
    return [setChannelInfo];
  }
  get routes() {
    return routes;
  }
  get pluginModule() {
    return pluginModule;
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
        PageNames.QUIZ_REPLACE_QUESTIONS,
        PageNames.QUIZ_SELECT_PRACTICE_QUIZ,
        PageNames.QUIZ_SELECT_RESOURCES,
        PageNames.QUIZ_SECTION_ORDER,
        PageNames.QUIZ_BOOK_MARKED_RESOURCES,
        PageNames.QUIZ_LEARNER_REPORT,
        PageNames.LESSON_SUMMARY,
        PageNames.LESSON_SUMMARY_BETTER,
        PageNames.LESSON_SELECT_RESOURCES,
        PageNames.LESSON_EDIT_DETAILS_BETTER,
        PageNames.LESSON_PREVIEW_SELECTED_RESOURCES,
        PageNames.LESSON_PREVIEW_RESOURCE,
        PageNames.LESSON_SELECT_RESOURCES_INDEX,
        PageNames.LESSON_SELECT_RESOURCES_BOOKMARKS,
        PageNames.LESSON_SELECT_RESOURCES_TOPIC_TREE,
      ];
      // If we're navigating to the same page for a quiz summary page, don't set loading
      if (
        !skipLoading.includes(to.name) &&
        !(to.params.quizId && from.params.quizId && to.name === from.name)
      ) {
        this.store.dispatch('loading');
      }
      const promises = [];

      // Clear the snackbar at every navigation to prevent it from re-appearing
      // when the next page component mounts.
      if (get(snackbarIsVisible) && !skipLoading.includes(to.name)) {
        clearSnackbar();
      }

      this.store.commit('SET_PAGE_NAME', to.name);
      if (
        to.name &&
        !to.params.classId &&
        !['CoachClassListPage', 'StatusTestPage', 'CoachPrompts', 'AllFacilitiesPage'].includes(
          to.name,
        )
      ) {
        this.store.dispatch('coachNotifications/stopPolling');
      }
      // temporary condition as we're gradually moving all promises below this line to local page handlers and therefore need to skip those that we already refactored here https://github.com/learningequality/kolibri/issues/11219
      if (
        to.name &&
        [
          PageNames.EXAMS_ROOT,
          PageNames.LESSONS_ROOT,
          PageNames.LESSON_CREATION_ROOT,
          PageNames.LESSON_SUMMARY,
          PageNames.LESSON_EDIT_DETAILS,
          PageNames.LESSON_RESOURCE_SELECTION_ROOT,
          PageNames.LESSON_RESOURCE_SELECTION,
          PageNames.LESSON_RESOURCE_SELECTION_SEARCH,
          PageNames.LESSON_SELECTION_BOOKMARKS,
          PageNames.LESSON_SELECTION_BOOKMARKS_MAIN,
          PageNames.LESSON_RESOURCE_SELECTION_CONTENT_PREVIEW,
          PageNames.RESOURCE_CONTENT_PREVIEW,
          PageNames.GROUP_SUMMARY,
          PageNames.GROUP_ENROLL,
          PageNames.GROUPS_ROOT,
          PageNames.HOME_PAGE,
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
        promises.push(this.store.dispatch('initClassInfo', to.params.classId));
      }

      if (get(isSuperuser) && this.store.state.core.facilities.length === 0) {
        promises.push(this.store.dispatch('getFacilities').catch(() => {}));
      }

      if (promises.length > 0) {
        Promise.all(promises)
          .catch(error => {
            this.store.dispatch('handleApiError', { error });
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
      this.store.dispatch('resetModuleState', { toRoute, fromRoute });
    });
    super.ready();
  }
}

export default new CoachToolsModule();
