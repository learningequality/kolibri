import KolibriModule from 'kolibri_module';
import * as coreActions from 'kolibri.coreVue.vuex.actions';
import router from 'kolibri.coreVue.router';

import Vue from 'kolibri.lib.vue';

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
import store from './state/store';
import { PageNames } from './constants';

class LearnModule extends KolibriModule {
  ready() {
    coreActions.getCurrentSession(store).then(() => actions.prepareLearnApp(store)).then(() => {
      const routes = [
        {
          path: '/',
          redirect: '/recommended',
        },
        {
          name: PageNames.TOPICS_ROOT,
          path: '/topics',
          handler: (toRoute, fromRoute) => {
            actions.showChannels(store);
          },
        },
        {
          name: PageNames.RECOMMENDED,
          path: '/recommended',
          handler: (toRoute, fromRoute) => {
            showLearn(store);
          },
        },
        {
          name: PageNames.SEARCH,
          path: '/search',
          handler: (toRoute, fromRoute) => {
            actions.showSearch(store, toRoute.query.query);
          },
        },
        {
          name: PageNames.CONTENT_UNAVAILABLE,
          path: '/content-unavailable',
          handler: (toRoute, fromRoute) => {
            actions.showContentUnavailable(store);
          },
        },
        {
          name: PageNames.TOPICS_CHANNEL,
          path: '/topics/:channel_id',
          handler: (toRoute, fromRoute) => {
            actions.showTopicsChannel(store, toRoute.params.channel_id);
          },
        },
        {
          name: PageNames.TOPICS_TOPIC,
          path: '/topics/t/:id',
          handler: (toRoute, fromRoute) => {
            actions.showTopicsTopic(store, toRoute.params.id);
          },
        },
        {
          name: PageNames.TOPICS_CONTENT,
          path: '/topics/c/:id',
          handler: (toRoute, fromRoute) => {
            actions.showTopicsContent(store, toRoute.params.id);
          },
        },
        {
          name: PageNames.RECOMMENDED_POPULAR,
          path: '/recommended/popular',
          handler: (toRoute, fromRoute) => {
            showPopularPage(store);
          },
        },
        {
          name: PageNames.RECOMMENDED_RESUME,
          path: '/recommended/resume',
          handler: (toRoute, fromRoute) => {
            showResumePage(store);
          },
        },
        {
          name: PageNames.RECOMMENDED_NEXT_STEPS,
          path: '/recommended/nextsteps',
          handler: (toRoute, fromRoute) => {
            showNextStepsPage(store);
          },
        },
        {
          name: PageNames.RECOMMENDED_FEATURED,
          path: '/recommended/featured/:channel_id',
          handler: (toRoute, fromRoute) => {
            showFeaturedPage(store, toRoute.params.channel_id);
          },
        },
        {
          name: PageNames.RECOMMENDED_CONTENT,
          path: '/recommended/:id',
          handler: (toRoute, fromRoute) => {
            showLearnContent(store, toRoute.params.id);
          },
        },
        {
          name: PageNames.EXAM_LIST,
          path: '/exams',
          handler: (toRoute, fromRoute) => {
            actions.showExamList(store);
          },
        },
        {
          name: PageNames.EXAM,
          path: '/exams/:id/:questionNumber',
          handler: (toRoute, fromRoute) => {
            actions.showExam(store, toRoute.params.id, toRoute.params.questionNumber);
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
      this.rootvue = new Vue({
        el: 'rootvue',
        render: createElement => createElement(RootVue),
        router: router.init(routes),
      });
    });
  }
}

const learnModule = new LearnModule();

export { learnModule as default };
