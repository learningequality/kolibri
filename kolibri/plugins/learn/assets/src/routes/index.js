import { get } from '@vueuse/core';
import client from 'kolibri.client';
import urls from 'kolibri.urls';
import store from 'kolibri.coreVue.vuex.store';
import router from 'kolibri.coreVue.router';
import useUser from 'kolibri.coreVue.composables.useUser';
import logger from 'kolibri.lib.logging';
import useChannels from '../composables/useChannels';
import { setClasses, setResumableContentNodes } from '../composables/useLearnerResources';
import { setContentNodeProgress } from '../composables/useContentNodeProgress';
import { showTopicsTopic, showTopicsContent } from '../modules/topicsTree/handlers';
import { showLibrary } from '../modules/recommended/handlers';
import { PageNames, ClassesPageNames, KolibriStudioId } from '../constants';
import LibraryPage from '../views/LibraryPage';
import HomePage from '../views/HomePage';
import TopicsPage from '../views/TopicsPage';
import TopicsContentPage from '../views/TopicsContentPage';
import ContentUnavailablePage from '../views/ContentUnavailablePage';
import BookmarkPage from '../views/BookmarkPage.vue';
import ExploreLibrariesPage from '../views/ExploreLibrariesPage';
import classesRoutes from './classesRoutes';

const { channels, channelsMap } = useChannels();
const { isUserLoggedIn } = useUser();

function unassignedContentGuard() {
  const { canAccessUnassignedContent } = store.getters;
  if (!canAccessUnassignedContent) {
    // If there are no memberships and it is allowed, redirect to topics page
    return router.replace({ name: ClassesPageNames.ALL_CLASSES });
  }
  return false;
}

function hydrateHomePage() {
  return client({ url: urls['kolibri:kolibri.plugins.learn:homehydrate']() }).then(response => {
    setClasses(response.data.classrooms);
    setResumableContentNodes(
      response.data.resumable_resources.results || [],
      response.data.resumable_resources.more || null
    );
    for (const progress of response.data.resumable_resources_progress) {
      setContentNodeProgress(progress);
    }
  });
}

const optionalDeviceIdPathSegment = `/:deviceId([a-f0-9]{32}|${KolibriStudioId})?`;

export default [
  {
    name: PageNames.ROOT,
    path: '/',
    handler: () => {
      if (get(isUserLoggedIn) && get(channels).length) {
        return router.replace({ name: PageNames.HOME });
      }
      return router.replace({ name: PageNames.LIBRARY });
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

      if (!get(isUserLoggedIn)) {
        router.replace({ name: PageNames.LIBRARY });
        return;
      }
      return store.dispatch('loading').then(() => {
        // force fetch classes and resumable content nodes to make sure that the home
        // page is up-to-date when navigating to other 'Learn' pages and then back
        // to the home page
        return hydrateHomePage()
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
  // Next class routes under home page
  ...classesRoutes.map(route => {
    return {
      ...route,
      path: `/home${route.path}`,
    };
  }),
  {
    name: PageNames.LIBRARY,
    path: '/library' + optionalDeviceIdPathSegment,
    handler: to => {
      if ((!get(channels) || !get(channels).length) && !get(isUserLoggedIn)) {
        router.replace({ name: PageNames.CONTENT_UNAVAILABLE });
        return;
      }

      if (unassignedContentGuard()) {
        return;
      }
      showLibrary(store, to.query, to.params.deviceId).catch(e => {
        logger.error(e);
        router.replace({ name: PageNames.ROOT });
      });
    },
    component: LibraryPage,
    props: route => {
      return {
        deviceId: route.params.deviceId,
      };
    },
  },
  {
    name: PageNames.CONTENT_UNAVAILABLE,
    path: '/resources-unavailable',
    handler: () => {
      store.commit('SET_PAGE_NAME', PageNames.CONTENT_UNAVAILABLE);
      store.commit('CORE_SET_PAGE_LOADING', false);
      store.commit('CORE_SET_ERROR', null);
    },
    component: ContentUnavailablePage,
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
    component: TopicsPage,
  },
  {
    // Handle redirect for links without the /folder appended
    path: `/topics${optionalDeviceIdPathSegment}/t/:id`,
    redirect: `/topics${optionalDeviceIdPathSegment}/t/:id/:subtopic?/folders`,
  },
  // Have to put TOPICS_TOPIC_SEARCH before TOPICS_TOPIC to ensure
  // search gets picked up before being interpreted as a subtopic id.
  {
    name: PageNames.TOPICS_TOPIC_SEARCH,
    path: `/topics${optionalDeviceIdPathSegment}/t/:id/search`,
    handler: (toRoute, fromRoute) => {
      if (unassignedContentGuard()) {
        return;
      }
      // If navigation is triggered by a custom navigation updating the
      // context query param, do not run the handler
      if (toRoute.params.id === fromRoute.params.id) {
        return;
      }
      showTopicsTopic(store, toRoute).catch(e => {
        logger.error(e);
        router.replace({ name: PageNames.ROOT });
      });
    },
    component: TopicsPage,
    props: true,
  },
  {
    name: PageNames.TOPICS_TOPIC,
    path: `/topics${optionalDeviceIdPathSegment}/t/:id/:subtopic?/folders`,
    handler: (toRoute, fromRoute) => {
      if (unassignedContentGuard()) {
        return;
      }
      // If navigation is triggered by a custom navigation updating the
      // context query param, do not run the handler
      if (toRoute.params.id === fromRoute.params.id) {
        return;
      }
      showTopicsTopic(store, toRoute).catch(e => {
        logger.error(e);
        router.replace({ name: PageNames.ROOT });
      });
    },
    component: TopicsPage,
    props: true,
  },
  {
    name: PageNames.TOPICS_CONTENT,
    path: `/topics${optionalDeviceIdPathSegment}/c/:id`,
    handler: toRoute => {
      showTopicsContent(store, toRoute.params.id, toRoute.params.deviceId).catch(e => {
        logger.error(e);
        router.replace({ name: PageNames.ROOT });
      });
    },
    component: TopicsContentPage,
    props: true,
  },
  {
    name: PageNames.BOOKMARKS,
    path: '/bookmarks',
    handler: () => {
      if (unassignedContentGuard()) {
        return;
      }
      store.commit('SET_PAGE_NAME', PageNames.BOOKMARKS);
      store.commit('CORE_SET_PAGE_LOADING', false);
    },
    component: BookmarkPage,
  },
  {
    name: PageNames.EXPLORE_LIBRARIES,
    path: '/explore_libraries',
    component: ExploreLibrariesPage,
    handler: () => {
      if (!get(isUserLoggedIn)) {
        router.replace({ name: PageNames.LIBRARY });
        return;
      }
      unassignedContentGuard();
    },
  },
  {
    path: '*',
    redirect: '/',
  },
];
