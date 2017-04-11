const KolibriModule = require('kolibri_module');
const coreActions = require('kolibri.coreVue.vuex.actions');
const router = require('kolibri.coreVue.router');

const Vue = require('kolibri.lib.vue');

const RootVue = require('./views');
const actions = require('./state/actions/main');
const groupActions = require('./state/actions/group');
const reportsActions = require('./state/actions/reports');
const store = require('./state/store');
const PageNames = require('./constants').PageNames;


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
          handler: (to, from) => {
            actions.showClassListPage(
              store
            );
          },
        },
        {
          name: PageNames.RECENT_CHANNELS,
          path: '/:classId/recent',
          handler: (to, from) => {
            reportsActions.showRecentChannels(
              store, to.params.classId
            );
          },
        },
        {
          name: PageNames.RECENT_ITEMS_FOR_CHANNEL,
          path: '/:classId/recent/:channelId',
          handler: (to, from) => {
            reportsActions.showRecentItemsForChannel(
              store, to.params.classId, to.params.channelId
            );
          },
        },
        {
          name: PageNames.RECENT_LEARNERS_FOR_ITEM,
          path: '/:classId/recent/:channelId/:contentId',
          handler: (to, from) => {
            reportsActions.showRecentLearnersForItem(
              store, to.params.classId, to.params.channelId, to.params.contentId
            );
          },
        },
        {
          name: PageNames.RECENT_LEARNER_ITEM_DETAILS,
          path: '/:classId/recent/:channelId/:contentId/:userId',
          handler: (to, from) => {
            reportsActions.showRecentLearnerItemDetails(
              store, to.params.classId, to.params.channelId, to.params.contentId, to.params.userId
            );
          },
        },
        {
          name: PageNames.TOPIC_CHANNELS,
          path: '/:classId/topics',
          handler: (to, from) => {
            reportsActions.showTopicChannels(
              store, to.params.classId
            );
          },
        },
        {
          name: PageNames.TOPIC_CHANNEL_ROOT,
          path: '/:classId/topics/:channelId',
          handler: (to, from) => {
            reportsActions.showTopicChannelRoot(
              store, to.params.classId, to.params.channelId
            );
          },
        },
        {
          name: PageNames.TOPIC_ITEM_LIST,
          path: '/:classId/topics/:channelId/topic/:topic',
          handler: (to, from) => {
            reportsActions.showTopicItemList(
              store, to.params.classId, to.params.channelId, to.params.topic
            );
          },
        },
        {
          name: PageNames.TOPIC_LEARNERS_FOR_ITEM,
          path: '/:classId/topics/:channelId/item/:contentId',
          handler: (to, from) => {
            reportsActions.showTopicLearnersForItem(
              store, to.params.classId, to.params.channelId, to.params.contentId
            );
          },
        },
        {
          name: PageNames.TOPIC_LEARNER_ITEM_DETAILS,
          path: '/:classId/topics/:channelId/item/:contentId/:userId',
          handler: (to, from) => {
            reportsActions.showTopicLearnerItemDetails(
              store, to.params.classId, to.params.channelId, to.params.contentId, to.params.userId
            );
          },
        },
        {
          name: PageNames.LEARNER_LIST,
          path: '/:classId/learners',
          handler: (to, from) => {
            reportsActions.showLearnerList(
              store, to.params.classId
            );
          },
        },
        {
          name: PageNames.LEARNER_CHANNELS,
          path: '/:classId/learners/:userId',
          handler: (to, from) => {
            reportsActions.showLearnerChannels(
              store, to.params.classId, to.params.userId
            );
          },
        },
        {
          name: PageNames.LEARNER_CHANNEL_ROOT,
          path: '/:classId/learners/:userId/:channelId',
          handler: (to, from) => {
            reportsActions.showLearnerChannelRoot(
              store, to.params.classId, to.params.userId, to.params.channelId
            );
          },
        },
        {
          name: PageNames.LEARNER_ITEM_LIST,
          path: '/:classId/learners/:userId/:channelId/topic/:topic',
          handler: (to, from) => {
            reportsActions.showLearnerItemList(
              store, to.params.classId, to.params.userId, to.params.channelId, to.params.topic
            );
          },
        },
        {
          name: PageNames.LEARNER_ITEM_DETAILS,
          path: '/:classId/learners/:userId/:channelId/item/:contentId',
          handler: (to, from) => {
            reportsActions.showLearnerItemDetails(
              store, to.params.classId, to.params.userId, to.params.channelId, to.params.contentId
            );
          },
        },
        {
          name: PageNames.EXAMS,
          path: '/:classId/exams',
          handler: (to, from) => {
            actions.showExamsPage(
              store, to.params.classId
            );
          },
        },
        {
          name: PageNames.GROUPS,
          path: '/:classId/groups',
          handler: (to, from) => {
            groupActions.showGroupsPage(
              store, to.params.classId
            );
          },
        },
        {
          name: PageNames.EXERCISE_RENDER,
          path: '/:userId/:contentId/exercise-render',
          handler: (to, from) => {
            actions.showCoachExerciseRenderPage(
              store, to.params.userId, to.params.contentId
            );
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

module.exports = new CoachToolsModule();
