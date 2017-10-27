import KolibriApp from 'kolibri_app';
import RootVue from './views';
import * as actions from './state/actions/main';
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
import store from 'kolibri.coreVue.vuex.store';

const routes = [
  {
    path: '/',
    redirect: '/recommended',
  },
  {
    name: PageNames.TOPICS_ROOT,
    path: '/topics',
    handler: () => {
      actions.showChannels(store);
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
      actions.showSearch(store, toRoute.query.query);
    },
  },
  {
    name: PageNames.CONTENT_UNAVAILABLE,
    path: '/content-unavailable',
    handler: () => {
      actions.showContentUnavailable(store);
    },
  },
  {
    name: PageNames.TOPICS_CHANNEL,
    path: '/topics/:channel_id',
    handler: toRoute => {
      actions.showTopicsChannel(store, toRoute.params.channel_id);
    },
  },
  {
    name: PageNames.TOPICS_TOPIC,
    path: '/topics/t/:id',
    handler: toRoute => {
      actions.showTopicsTopic(store, toRoute.params.id);
    },
  },
  {
    name: PageNames.TOPICS_CONTENT,
    path: '/topics/c/:id',
    handler: toRoute => {
      actions.showTopicsContent(store, toRoute.params.id);
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
  {
    name: PageNames.EXAM_LIST,
    path: '/exams',
    handler: () => {
      actions.showExamList(store);
    },
  },
  {
    name: PageNames.EXAM,
    path: '/exams/:id/:questionNumber',
    handler: toRoute => {
      const { id, questionNumber } = toRoute.params;
      actions.showExam(store, id, questionNumber);
    },
  },
  {
    name: PageNames.EXAM_ROOT,
    path: '/:channel_id/exams/:id',
    redirect: '/:channel_id/exams/:id/0',
  },
  {
    path: '*',
    redirect: '/',
  },
];

class LearnModule extends KolibriApp {
  get stateSetters() {
    return [actions.prepareLearnApp];
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

const learnModule = new LearnModule();

export { learnModule as default };
