import store from 'kolibri.coreVue.vuex.store';
import router from 'kolibri.coreVue.router';
import { showClassListPage, shouldRedirectToClassRootPage } from '../modules/coreCoach/handlers';
import { showGroupsPage } from '../modules/groups/handlers';
import {
  showChannelListForReports,
  showChannelRootReport,
  showItemListReports,
  showLearnerChannels,
  showLearnerList,
  showLearnerReportsForItem,
  showRecentItemsForChannel,
} from '../modules/reports/handlers';
import {
  showRecentLearnerItemDetails,
  showTopicLearnerItemDetails,
  showLearnerItemDetails,
} from '../modules/exerciseDetail/handlers';
import { PageNames } from '../constants';
import examRoutes from './examRoutes';
import reportRoutes from './reportRoutes';
import planRoutes from './planRoutes';
import newRoutes from './newRoutes';

export default [
  ...examRoutes,
  {
    name: PageNames.CLASS_LIST,
    path: '/old/',
    handler: () => {
      store.commit('USE_OLD_INDEX_STYLE', true);
      return shouldRedirectToClassRootPage().then(classId => {
        if (classId) {
          return router.replace({
            name: PageNames.CLASS_ROOT,
            params: {
              classId,
            },
          });
        }
        return showClassListPage(store);
      });
    },
  },
  {
    name: PageNames.CLASS_ROOT,
    path: '/old/:classId/',
    redirect: '/old/:classId/learners/',
  },
  {
    name: PageNames.RECENT_CHANNELS,
    path: '/old/:classId/recent',
    handler: to => {
      store.commit('USE_OLD_INDEX_STYLE', true);
      showChannelListForReports(store, { ...to.params, showRecentOnly: true });
    },
  },
  {
    name: PageNames.RECENT_ITEMS_FOR_CHANNEL,
    path: '/old/:classId/recent/:channelId',
    handler: to => {
      store.commit('USE_OLD_INDEX_STYLE', true);
      showRecentItemsForChannel(store, to.params);
    },
  },
  {
    name: PageNames.RECENT_LEARNERS_FOR_ITEM,
    path: '/old/:classId/recent/:channelId/:contentId',
    handler: to => {
      store.commit('USE_OLD_INDEX_STYLE', true);
      showLearnerReportsForItem(store, { ...to.params, showRecentOnly: true });
    },
  },
  {
    name: PageNames.RECENT_LEARNER_ITEM_DETAILS_ROOT,
    path: '/old/:classId/recent/:channelId/:contentId/:userId',
    redirect: '/old/:classId/recent/:channelId/:contentId/:userId/0/0',
  },
  {
    name: PageNames.RECENT_LEARNER_ITEM_DETAILS,
    path: '/old/:classId/recent/:channelId/:contentId/:userId/:attemptLogIndex/:interactionIndex',
    handler: to => {
      store.commit('USE_OLD_INDEX_STYLE', true);
      showRecentLearnerItemDetails(
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
    path: '/old/:classId/topics',
    handler: to => {
      store.commit('USE_OLD_INDEX_STYLE', true);
      showChannelListForReports(store, { ...to.params, showRecentOnly: false });
    },
  },
  {
    name: PageNames.TOPIC_CHANNEL_ROOT,
    path: '/old/:classId/topics/:channelId',
    handler: to => {
      store.commit('USE_OLD_INDEX_STYLE', true);
      showChannelRootReport(store, to.params);
    },
  },
  {
    name: PageNames.TOPIC_ITEM_LIST,
    path: '/old/:classId/topics/:channelId/topic/:topicId',
    handler: to => {
      store.commit('USE_OLD_INDEX_STYLE', true);
      showItemListReports(store, to.params);
    },
  },
  {
    name: PageNames.TOPIC_LEARNERS_FOR_ITEM,
    path: '/old/:classId/topics/:channelId/item/:contentId',
    handler: to => {
      store.commit('USE_OLD_INDEX_STYLE', true);
      showLearnerReportsForItem(store, { ...to.params, showRecentOnly: false });
    },
  },
  {
    name: PageNames.TOPIC_LEARNER_ITEM_DETAILS_ROOT,
    path: '/old/:classId/topics/:channelId/item/:contentId/:userId',
    redirect: '/old/:classId/topics/:channelId/item/:contentId/:userId/0/0',
  },
  {
    name: PageNames.TOPIC_LEARNER_ITEM_DETAILS,
    path:
      '/old/:classId/topics/:channelId/item/:contentId/:userId/:attemptLogIndex/:interactionIndex',
    handler: to => {
      store.commit('USE_OLD_INDEX_STYLE', true);
      showTopicLearnerItemDetails(
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
    path: '/old/:classId/learners',
    handler: to => {
      store.commit('USE_OLD_INDEX_STYLE', true);
      showLearnerList(store, to.params.classId);
    },
  },
  {
    name: PageNames.LEARNER_CHANNELS,
    path: '/old/:classId/learners/:userId',
    handler: to => {
      store.commit('USE_OLD_INDEX_STYLE', true);
      showLearnerChannels(store, to.params);
    },
  },
  {
    name: PageNames.LEARNER_CHANNEL_ROOT,
    path: '/old/:classId/learners/:userId/:channelId',
    handler: to => {
      store.commit('USE_OLD_INDEX_STYLE', true);
      showChannelRootReport(store, to.params);
    },
  },
  {
    name: PageNames.LEARNER_ITEM_LIST,
    path: '/old/:classId/learners/:userId/:channelId/topic/:topicId',
    handler: to => {
      store.commit('USE_OLD_INDEX_STYLE', true);
      showItemListReports(store, to.params);
    },
  },
  {
    name: PageNames.LEARNER_ITEM_DETAILS_ROOT,
    path: '/old/:classId/learners/:userId/:channelId/item/:contentId',
    redirect: '/old/:classId/learners/:userId/:channelId/item/:contentId/0/0',
  },
  {
    name: PageNames.LEARNER_ITEM_DETAILS,
    path:
      '/old/:classId/learners/:userId/:channelId/item/:contentId/:attemptLogIndex/:interactionIndex',
    handler: to => {
      store.commit('USE_OLD_INDEX_STYLE', true);
      showLearnerItemDetails(
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
  ...reportRoutes,
  ...planRoutes,
  ...newRoutes,
];
