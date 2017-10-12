import KolibriModule from 'kolibri_module';
import * as coreActions from 'kolibri.coreVue.vuex.actions';
import router from 'kolibri.coreVue.router';

import Vue from 'kolibri.lib.vue';

import RootVue from './views';
import * as actions from './state/actions/main';
import * as groupActions from './state/actions/group';
import * as examActions from './state/actions/exam';
import * as reportsActions from './state/actions/reports';
import store from './state/store';
import { PageNames } from './constants';

class CoachToolsModule extends KolibriModule {
  ready() {
    const coreStoreUpdates = [
      coreActions.getCurrentSession(store),
      coreActions.setChannelInfo(store),
    ];
    Promise.all(coreStoreUpdates).then(() => {
      const routes = [
        {
          name: PageNames.CLASS_LIST,
          path: '/',
          handler: () => {
            actions.showClassListPage(store);
          },
        },
        {
          name: PageNames.EXAMS,
          path: '/:classId/exams',
          handler: toRoute => {
            examActions.showExamsPage(store, toRoute.params.classId);
          },
        },
        {
          name: PageNames.CREATE_EXAM,
          path: '/:classId/exams/new/:channelId',
          handler: toRoute => {
            examActions.showCreateExamPage(store, toRoute.params.classId, toRoute.params.channelId);
          },
        },
        {
          name: PageNames.EXAM_REPORT,
          path: '/:classId/:channelId/exams/:examId',
          handler: toRoute => {
            examActions.showExamReportPage(
              store,
              toRoute.params.classId,
              toRoute.params.channelId,
              toRoute.params.examId
            );
          },
        },
        {
          name: PageNames.EXAM_REPORT_DETAIL_ROOT,
          path: '/:classId/:channelId/exams/:examId/users/:userId',
          redirect: '/:classId/:channelId/exams/:examId/users/:userId/0/0',
        },
        {
          name: PageNames.EXAM_REPORT_DETAIL,
          path: '/:classId/:channelId/exams/:examId/users/:userId/:question/:interaction',
          handler: toRoute => {
            examActions.showExamReportDetailPage(
              store,
              toRoute.params.classId,
              toRoute.params.userId,
              toRoute.params.channelId,
              toRoute.params.examId,
              toRoute.params.question,
              toRoute.params.interaction
            );
          },
        },
        {
          name: PageNames.RECENT_CHANNELS,
          path: '/:classId/recent',
          handler: to => {
            reportsActions.showRecentChannels(store, to.params.classId);
          },
        },
        {
          name: PageNames.RECENT_ITEMS_FOR_CHANNEL,
          path: '/:classId/recent/:channelId',
          handler: to => {
            reportsActions.showRecentItemsForChannel(store, to.params.classId, to.params.channelId);
          },
        },
        {
          name: PageNames.RECENT_LEARNERS_FOR_ITEM,
          path: '/:classId/recent/:channelId/:contentId',
          handler: to => {
            reportsActions.showRecentLearnersForItem(
              store,
              to.params.classId,
              to.params.channelId,
              to.params.contentId
            );
          },
        },
        {
          name: PageNames.RECENT_LEARNER_ITEM_DETAILS_ROOT,
          path: '/:classId/recent/:channelId/:contentId/:userId',
          redirect: '/:classId/recent/:channelId/:contentId/:userId/0/0',
        },
        {
          name: PageNames.RECENT_LEARNER_ITEM_DETAILS,
          path: '/:classId/recent/:channelId/:contentId/:userId/:attemptLogIndex/:interactionIndex',
          handler: to => {
            reportsActions.showRecentLearnerItemDetails(
              store,
              to.params.classId,
              to.params.userId,
              to.params.channelId,
              to.params.contentId,
              Number(to.params.attemptLogIndex),
              Number(to.params.interactionIndex)
            );
          },
        },
        {
          name: PageNames.TOPIC_CHANNELS,
          path: '/:classId/topics',
          handler: to => {
            reportsActions.showTopicChannels(store, to.params.classId);
          },
        },
        {
          name: PageNames.TOPIC_CHANNEL_ROOT,
          path: '/:classId/topics/:channelId',
          handler: to => {
            reportsActions.showTopicChannelRoot(store, to.params.classId, to.params.channelId);
          },
        },
        {
          name: PageNames.TOPIC_ITEM_LIST,
          path: '/:classId/topics/:channelId/topic/:topicId',
          handler: to => {
            reportsActions.showTopicItemList(
              store,
              to.params.classId,
              to.params.channelId,
              to.params.topicId
            );
          },
        },
        {
          name: PageNames.TOPIC_LEARNERS_FOR_ITEM,
          path: '/:classId/topics/:channelId/item/:contentId',
          handler: to => {
            reportsActions.showTopicLearnersForItem(
              store,
              to.params.classId,
              to.params.channelId,
              to.params.contentId
            );
          },
        },
        {
          name: PageNames.TOPIC_LEARNER_ITEM_DETAILS_ROOT,
          path: '/:classId/topics/:channelId/item/:contentId/:userId',
          redirect: '/:classId/topics/:channelId/item/:contentId/:userId/0/0',
        },
        {
          name: PageNames.TOPIC_LEARNER_ITEM_DETAILS,
          path:
            '/:classId/topics/:channelId/item/:contentId/:userId/:attemptLogIndex/:interactionIndex',
          handler: to => {
            reportsActions.showTopicLearnerItemDetails(
              store,
              to.params.classId,
              to.params.userId,
              to.params.channelId,
              to.params.contentId,
              Number(to.params.attemptLogIndex),
              Number(to.params.interactionIndex)
            );
          },
        },
        {
          name: PageNames.LEARNER_LIST,
          path: '/:classId/learners',
          handler: to => {
            reportsActions.showLearnerList(store, to.params.classId);
          },
        },
        {
          name: PageNames.LEARNER_CHANNELS,
          path: '/:classId/learners/:userId',
          handler: to => {
            reportsActions.showLearnerChannels(store, to.params.classId, to.params.userId);
          },
        },
        {
          name: PageNames.LEARNER_CHANNEL_ROOT,
          path: '/:classId/learners/:userId/:channelId',
          handler: to => {
            reportsActions.showLearnerChannelRoot(
              store,
              to.params.classId,
              to.params.userId,
              to.params.channelId
            );
          },
        },
        {
          name: PageNames.LEARNER_ITEM_LIST,
          path: '/:classId/learners/:userId/:channelId/topic/:topicId',
          handler: to => {
            reportsActions.showLearnerItemList(
              store,
              to.params.classId,
              to.params.userId,
              to.params.channelId,
              to.params.topicId
            );
          },
        },
        {
          name: PageNames.LEARNER_ITEM_DETAILS_ROOT,
          path: '/:classId/learners/:userId/:channelId/item/:contentId',
          redirect: '/:classId/learners/:userId/:channelId/item/:contentId/0/0',
        },
        {
          name: PageNames.LEARNER_ITEM_DETAILS,
          path:
            '/:classId/learners/:userId/:channelId/item/:contentId/:attemptLogIndex/:interactionIndex',
          handler: to => {
            reportsActions.showLearnerItemDetails(
              store,
              to.params.classId,
              to.params.userId,
              to.params.channelId,
              to.params.contentId,
              Number(to.params.attemptLogIndex),
              Number(to.params.interactionIndex)
            );
          },
        },
        {
          name: PageNames.GROUPS,
          path: '/:classId/groups',
          handler: to => {
            groupActions.showGroupsPage(store, to.params.classId);
          },
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

const coachToolsModule = new CoachToolsModule();

export { coachToolsModule as default };
