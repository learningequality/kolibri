import { get } from '@vueuse/core';
import client from 'kolibri.client';
import urls from 'kolibri.urls';
import store from 'kolibri.coreVue.vuex.store';
import router from 'kolibri.coreVue.router';
import useChannels from '../composables/useChannels';
import useUser from '../composables/useUser';
import { setClasses, setResumableContentNodes } from '../composables/useLearnerResources';
import { setContentNodeProgress } from '../composables/useContentNodeProgress';
import { showTopicsTopic, showTopicsContent } from '../modules/topicsTree/handlers';
import { showLibrary } from '../modules/recommended/handlers';
import { PageNames, ClassesPageNames } from '../constants';
import LibraryPage from '../views/LibraryPage';
import HomePage from '../views/HomePage';
import classesRoutes from './classesRoutes';

const { channels, channelsMap } = useChannels();
const { isUserLoggedIn } = useUser();

function unassignedContentGuard() {
  const { canAccessUnassignedContent } = store.getters;
  if (!canAccessUnassignedContent) {
    // If there are no memberships and it is allowed, redirect to topics page
    return router.replace({ name: ClassesPageNames.ALL_CLASSES });
  }
  // Otherwise return nothing
  return;
}

function hydrateHomePage() {
  return client({ url: urls['kolibri:kolibri.plugins.learn:homehydrate']() }).then(response => {
    setClasses(response.data.classrooms);
    setResumableContentNodes(
      response.data.resumable_resources.results || [],
      response.data.resumable_resources.more || null
    );
    for (let progress of response.data.resumable_resources_progress) {
      setContentNodeProgress(progress);
    }
  });
}

export default [
  {
    name: PageNames.ROOT,
    path: '/',
    handler: () => {
      if (get(isUserLoggedIn)) {
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
    path: '/library',
    handler: to => {
      if (unassignedContentGuard()) {
        return unassignedContentGuard();
      }
      showLibrary(store, to.query);
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
    // Handle redirect for links without the /folder appended
    path: '/topics/t/:id',
    redirect: '/topics/t/:id/:subtopic?/folders',
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
  // Have to put TOPICS_TOPIC_SEARCH before TOPICS_TOPIC to ensure
  // search gets picked up before being interpreted as a subtopic id.
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
    name: PageNames.TOPICS_TOPIC,
    path: '/topics/t/:id/:subtopic?/folders',
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
      showTopicsContent(store, toRoute.params.id);
    },
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
