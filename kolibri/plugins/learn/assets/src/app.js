import KolibriModule from 'kolibri_module';
import * as coreActions from 'kolibri.coreVue.vuex.actions';
import router from 'kolibri.coreVue.router';

import Vue from 'kolibri.lib.vue';

import RootVue from './views';
import * as actions from './state/actions/main';
import {
  showLearnChannel,
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
          name: PageNames.EXPLORE_ROOT,
          path: '/topics',
          handler: (toRoute, fromRoute) => {
            actions.redirectToExploreChannel(store);
          },
        },
        {
          name: PageNames.LEARN_ROOT,
          path: '/recommended',
          handler: (toRoute, fromRoute) => {
            actions.redirectToLearnChannel(store);
          },
        },
        {
          name: PageNames.SEARCH_ROOT,
          path: '/search',
          handler: (toRoute, fromRoute) => {
            actions.redirectToChannelSearch(store);
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
          name: PageNames.EXPLORE_CHANNEL,
          path: '/:channel_id/topics',
          handler: (toRoute, fromRoute) => {
            actions.showExploreChannel(store, toRoute.params.channel_id);
          },
        },
        {
          name: PageNames.EXPLORE_TOPIC,
          path: '/:channel_id/topics/t/:id',
          handler: (toRoute, fromRoute) => {
            actions.showExploreTopic(store, toRoute.params.channel_id, toRoute.params.id);
          },
        },
        {
          name: PageNames.EXPLORE_CONTENT,
          path: '/:channel_id/topics/c/:id',
          handler: (toRoute, fromRoute) => {
            actions.showExploreContent(store, toRoute.params.channel_id, toRoute.params.id);
          },
        },
        {
          name: PageNames.LEARN_CHANNEL,
          path: '/:channel_id/recommended',
          handler: (toRoute, fromRoute) => {
            const cursor = toRoute.query.cursor;
            showLearnChannel(store, toRoute.params.channel_id, cursor);
          },
        },
        {
          name: PageNames.RECOMMENDED_POPULAR,
          path: '/:channel_id/recommended/popular',
          handler: (toRoute, fromRoute) => {
            showPopularPage(store, toRoute.params.channel_id);
          },
        },
        {
          name: PageNames.RECOMMENDED_RESUME,
          path: '/:channel_id/recommended/resume',
          handler: (toRoute, fromRoute) => {
            showResumePage(store, toRoute.params.channel_id);
          },
        },
        {
          name: PageNames.RECOMMENDED_NEXT_STEPS,
          path: '/:channel_id/recommended/nextsteps',
          handler: (toRoute, fromRoute) => {
            showNextStepsPage(store, toRoute.params.channel_id);
          },
        },
        {
          name: PageNames.RECOMMENDED_FEATURED,
          path: '/:channel_id/recommended/featured',
          handler: (toRoute, fromRoute) => {
            showFeaturedPage(store, toRoute.params.channel_id);
          },
        },
        {
          name: PageNames.LEARN_CONTENT,
          path: '/:channel_id/recommended/:id',
          handler: (toRoute, fromRoute) => {
            showLearnContent(store, toRoute.params.channel_id, toRoute.params.id);
          },
        },
        {
          name: PageNames.SEARCH,
          path: '/:channel_id/search',
          handler: (toRoute, fromRoute) => {
            actions.showSearch(store, toRoute.params.channel_id, toRoute.query.query);
          },
        },
        {
          name: PageNames.EXAM_LIST,
          path: '/:channel_id/exams',
          handler: (toRoute, fromRoute) => {
            actions.showExamList(store, toRoute.params.channel_id);
          },
        },
        {
          name: PageNames.EXAM,
          path: '/:channel_id/exams/:id/:questionNumber',
          handler: (toRoute, fromRoute) => {
            actions.showExam(
              store,
              toRoute.params.channel_id,
              toRoute.params.id,
              toRoute.params.questionNumber
            );
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
