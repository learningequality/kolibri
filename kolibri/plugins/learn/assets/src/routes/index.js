import store from 'kolibri.coreVue.vuex.store';
import router from 'kolibri.coreVue.router';
import { showSearch } from '../modules/search/handlers';
import {
  showTopicsTopic,
  showTopicsChannel,
  showTopicsContent,
} from '../modules/topicsTree/handlers';
import {
  showRecommended,
  showPopularPage,
  showNextStepsPage,
  showResumePage,
} from '../modules/recommended/handlers';
import { showChannels } from '../modules/topicsRoot/handlers';
import { PageNames, ClassesPageNames } from '../constants';
import RecommendedPage from '../views/RecommendedPage';
import RecommendedSubpage from '../views/RecommendedSubpage';
import classesRoutes from './classesRoutes';

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
      const { memberships } = store.state;
      const { canAccessUnassignedContent } = store.getters;

      // If a registered user, go to Classes Page, else go to Content
      return router.replace({
        name:
          memberships.length > 0 || !canAccessUnassignedContent
            ? ClassesPageNames.ALL_CLASSES
            : PageNames.TOPICS_ROOT,
      });
    },
  },
  {
    name: PageNames.TOPICS_ROOT,
    path: '/topics',
    handler: () => {
      if (unassignedContentGuard()) {
        return unassignedContentGuard();
      }
      showChannels(store);
    },
  },
  {
    name: PageNames.RECOMMENDED,
    path: '/recommended',
    handler: () => {
      if (unassignedContentGuard()) {
        return unassignedContentGuard();
      }
      showRecommended(store);
    },
    component: RecommendedPage,
  },
  {
    name: PageNames.SEARCH,
    path: '/search',
    handler: toRoute => {
      if (unassignedContentGuard()) {
        return unassignedContentGuard();
      }
      showSearch(store, { ...toRoute.query });
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
  },
  {
    name: PageNames.TOPICS_CHANNEL,
    path: '/topics/:channel_id',
    handler: (toRoute, fromRoute) => {
      if (unassignedContentGuard()) {
        return unassignedContentGuard();
      }
      // If navigation is triggered by a custom channel updating the
      // context query param, do not run the handler
      if (toRoute.params.channel_id === fromRoute.params.channel_id) {
        return;
      }
      showTopicsChannel(store, toRoute.params.channel_id);
    },
  },
  {
    name: PageNames.TOPICS_TOPIC,
    path: '/topics/t/:id',
    handler: toRoute => {
      if (unassignedContentGuard()) {
        return unassignedContentGuard();
      }
      showTopicsTopic(store, { id: toRoute.params.id });
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
    path: '*',
    redirect: '/',
  },
];
