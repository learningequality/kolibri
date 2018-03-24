import KolibriApp from 'kolibri_app';
import RootVue from './views';
import prepareLearnApp from './state/prepareLearnApp';
import {
  showRoot,
  showChannels,
  showSearch,
  showContentUnavailable,
  showTopicsTopic,
  showTopicsChannel,
  showTopicsContent,
  setFacilitiesAndConfig,
} from './state/actions/main';
import {
  showLearn,
  showPopularPage,
  showNextStepsPage,
  showResumePage,
  showFeaturedPage,
  showLearnContent,
} from './state/actions/recommended';
import { initialState, mutations } from './state/store';
import { PageNames } from './constants';
import classesRoutes from './classesRoutes';
import store from 'kolibri.coreVue.vuex.store';

const routes = [
  {
    name: PageNames.ROOT,
    path: '/',
    handler: () => {
      showRoot(store);
    },
  },
  {
    name: PageNames.TOPICS_ROOT,
    path: '/topics',
    handler: () => {
      showChannels(store);
    },
  },
  {
    name: PageNames.RECOMMENDED,
    path: '/recommended',
    handler: () => {
      showLearn(store);
    },
  },
  {
    name: PageNames.SEARCH,
    path: '/search',
    handler: toRoute => {
      showSearch(store, toRoute.query.query);
    },
  },
  {
    name: PageNames.CONTENT_UNAVAILABLE,
    path: '/content-unavailable',
    handler: () => {
      showContentUnavailable(store);
    },
  },
  {
    name: PageNames.TOPICS_CHANNEL,
    path: '/topics/:channel_id',
    handler: toRoute => {
      showTopicsChannel(store, toRoute.params.channel_id);
    },
  },
  {
    name: PageNames.TOPICS_TOPIC,
    path: '/topics/t/:id',
    handler: toRoute => {
      showTopicsTopic(store, toRoute.params.id);
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
    name: PageNames.RECOMMENDED_POPULAR,
    path: '/recommended/popular',
    handler: () => {
      showPopularPage(store);
    },
  },
  {
    name: PageNames.RECOMMENDED_RESUME,
    path: '/recommended/resume',
    handler: () => {
      showResumePage(store);
    },
  },
  {
    name: PageNames.RECOMMENDED_NEXT_STEPS,
    path: '/recommended/nextsteps',
    handler: () => {
      showNextStepsPage(store);
    },
  },
  {
    name: PageNames.RECOMMENDED_FEATURED,
    path: '/recommended/featured/:channel_id',
    handler: toRoute => {
      showFeaturedPage(store, toRoute.params.channel_id);
    },
  },
  {
    name: PageNames.RECOMMENDED_CONTENT,
    path: '/recommended/:id',
    handler: toRoute => {
      showLearnContent(store, toRoute.params.id);
    },
  },
  ...classesRoutes,
  {
    path: '*',
    redirect: '/',
  },
];

class LearnModule extends KolibriApp {
  get stateSetters() {
    return [prepareLearnApp, setFacilitiesAndConfig];
  }
  get routes() {
    return routes;
  }
  get RootVue() {
    return RootVue;
  }
  get initialState() {
    return initialState;
  }
  get mutations() {
    return mutations;
  }
}

export default new LearnModule();
