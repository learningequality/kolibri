import { get } from '@vueuse/core';
import store from 'kolibri.coreVue.vuex.store';
import router from 'kolibri.coreVue.router';
import useChannels from '../composables/useChannels';
import useUser from '../composables/useUser';
import useLearnerResources from '../composables/useLearnerResources';
import { showTopicsTopic, showTopicsContent } from '../modules/topicsTree/handlers';
import {
  showLibrary,
  showPopularPage,
  showNextStepsPage,
  showResumePage,
} from '../modules/recommended/handlers';
import { PageNames, ClassesPageNames } from '../constants';
import LibraryPage from '../views/LibraryPage';
import HomePage from '../views/HomePage';
import RecommendedSubpage from '../views/RecommendedSubpage';
import classesRoutes from './classesRoutes';

const { channels, channelsMap } = useChannels();
const { isUserLoggedIn } = useUser();
const { fetchClasses, fetchResumableContentNodes } = useLearnerResources();

function unassignedContentGuard() {
  const { canAccessUnassignedContent } = store.getters;
  if (!canAccessUnassignedContent) {
    // If there are no memberships and it is allowed, redirect to topics page
    return router.replace({ name: ClassesPageNames.ALL_CLASSES });
  }
  // Otherwise return nothing
  return;
}

export default [
  ...classesRoutes,
  {
    name: PageNames.ROOT,
    path: '/',
    handler: () => {
      return router.replace({ name: PageNames.HOME });
    },
  },
  {
    name: PageNames.HOME,
    path: '/home',
    component: HomePage,
    handler() {
      if (!get(channels) || !get(channels).length) {
        router.replace({ name: PageNames.CONTENT_UNAVAILABLE });
        return;
      }
      const promises = [];
      // force fetch classes and resumable content nodes to make sure that the home
      // page is up-to-date when navigating to other 'Learn' pages and then back
      // to the home page
      if (get(isUserLoggedIn)) {
        promises.push(fetchClasses({ force: true }), fetchResumableContentNodes({ force: true }));
      }
      return store.dispatch('loading').then(() => {
        return Promise.all(promises)
          .then(() => {
            store.commit('SET_PAGE_NAME', PageNames.HOME);
            store.dispatch('notLoading');
          })
          .catch(error => {
            return store.dispatch('handleApiError', error);
          });
      });
    },
  },
  {
    name: PageNames.LIBRARY,
    path: '/library',
    handler: () => {
      if (unassignedContentGuard()) {
        return unassignedContentGuard();
      }
      showLibrary(store);
    },
    component: LibraryPage,
  },
  {
    name: PageNames.CONTENT_UNAVAILABLE,
    path: '/resources-unavailable',
    handler: () => {
      store.commit('SET_PAGE_NAME', PageNames.CONTENT_UNAVAILABLE);
      store.commit('CORE_SET_PAGE_LOADING', false);
      store.commit('CORE_SET_ERROR', null);
    },
  },
  {
    // Handle historic channel page with redirect
    path: '/topics/:channel_id',
    redirect: to => {
      const { channel_id } = to.params;
      const id = get(channelsMap)[channel_id].root;
      return {
        name: PageNames.TOPICS_TOPIC,
        params: {
          id,
        },
      };
    },
  },
  {
    name: PageNames.TOPICS_TOPIC,
    path: '/topics/t/:id',
    handler: (toRoute, fromRoute) => {
      if (unassignedContentGuard()) {
        return unassignedContentGuard();
      }
      // If navigation is triggered by a custom navigation updating the
      // context query param, do not run the handler
      if (toRoute.params.id === fromRoute.params.id) {
        return;
      }
      showTopicsTopic(store, { id: toRoute.params.id, pageName: toRoute.name });
    },
  },
  {
    name: PageNames.TOPICS_TOPIC_SEARCH,
    path: '/topics/t/:id/search',
    handler: (toRoute, fromRoute) => {
      if (unassignedContentGuard()) {
        return unassignedContentGuard();
      }
      // If navigation is triggered by a custom navigation updating the
      // context query param, do not run the handler
      if (toRoute.params.id === fromRoute.params.id) {
        return;
      }
      showTopicsTopic(store, { id: toRoute.params.id, pageName: toRoute.name });
    },
  },
  {
    name: PageNames.TOPICS_CONTENT,
    path: '/topics/c/:id',
    handler: toRoute => {
      if (unassignedContentGuard()) {
        return unassignedContentGuard();
      }
      showTopicsContent(store, toRoute.params.id);
    },
  },
  {
    name: PageNames.RECOMMENDED_POPULAR,
    path: '/recommended/popular',
    handler: () => {
      if (unassignedContentGuard()) {
        return unassignedContentGuard();
      }
      showPopularPage(store);
    },
    component: RecommendedSubpage,
  },
  {
    name: PageNames.RECOMMENDED_RESUME,
    path: '/recommended/resume',
    handler: () => {
      if (unassignedContentGuard()) {
        return unassignedContentGuard();
      }
      showResumePage(store);
    },
    component: RecommendedSubpage,
  },
  {
    name: PageNames.RECOMMENDED_NEXT_STEPS,
    path: '/recommended/nextsteps',
    handler: () => {
      if (unassignedContentGuard()) {
        return unassignedContentGuard();
      }
      showNextStepsPage(store);
    },
    component: RecommendedSubpage,
  },
  {
    name: PageNames.BOOKMARKS,
    path: '/bookmarks',
    handler: () => {
      if (unassignedContentGuard()) {
        return unassignedContentGuard();
      }
      store.commit('SET_PAGE_NAME', PageNames.BOOKMARKS);
      store.commit('CORE_SET_PAGE_LOADING', false);
    },
  },
  {
    path: '*',
    redirect: '/',
  },
];
