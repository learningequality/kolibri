import KolibriApp from 'kolibri_app';
import { setChannelInfo } from 'kolibri.coreVue.vuex.actions';
import store from 'kolibri.coreVue.vuex.store';

import RootVue from './views';
import * as actions from './state/actions/main';
import * as groupActions from './state/actions/group';
import * as examActions from './state/actions/exam';
import * as reportsActions from './state/actions/reports';
import { initialState, mutations } from './state/store';
import { PageNames } from './constants';
import { LessonsPageNames } from './lessonsConstants';
import router from 'kolibri.coreVue.router';

import {
  showLessonsRootPage,
  showLessonSummaryPage,
  showLessonResourceSummaryPage,
  showLessonResourceUserSummaryPage,
  showLessonReviewPage,
  showLessonResourceSelectionRootPage,
  showLessonResourceSelectionTopicPage,
  showLessonSelectionSearchPage,
  showLessonContentPreview,
} from './state/actions/lessons';

// Redirect to the Lessons List of a different classroom if
// classroom switcher is used in e.g. a Lesson Summary page
function redirectToLessonsList(classId) {
  router.push({
    name: LessonsPageNames.ROOT,
    params: {
      classId,
    },
  });
}

const lessonRoutes = [
  {
    name: LessonsPageNames.ROOT,
    path: '/:classId/lessons',
    handler: toRoute => {
      showLessonsRootPage(store, toRoute.params.classId);
    },
  },
  {
    name: LessonsPageNames.SUMMARY,
    path: '/:classId/lessons/:lessonId',
    handler: (toRoute, fromRoute) => {
      if (fromRoute.name !== null && toRoute.params.classId !== fromRoute.params.classId) {
        redirectToLessonsList(toRoute.params.classId);
      }
      showLessonSummaryPage(store, toRoute.params.classId, toRoute.params.lessonId);
    },
  },
  {
    name: LessonsPageNames.RESOURCE_SUMMARY,
    path: '/:classId/lessons/:lessonId/resource/:contentId',
    handler: toRoute => {
      showLessonResourceSummaryPage(
        store,
        toRoute.params.classId,
        toRoute.params.lessonId,
        toRoute.params.contentId
      );
    },
  },
  {
    name: LessonsPageNames.RESOURCE_USER_SUMMARY,
    path: '/:classId/lessons/:lessonId/resource/:contentId/user/:userId',
    handler: toRoute => {
      showLessonResourceUserSummaryPage(
        store,
        toRoute.params.classId,
        toRoute.params.lessonId,
        toRoute.params.contentId,
        toRoute.params.userId
      );
    },
  },
  {
    name: LessonsPageNames.REVIEW,
    path: '/:classId/lessons/:lessonId/review',
    handler: toRoute => {
      showLessonReviewPage(store, toRoute.params.classId, toRoute.params.lessonId);
    },
  },
  {
    name: LessonsPageNames.SELECTION_ROOT,
    path: '/:classId/lessons/:lessonId/selection',
    handler: toRoute => {
      showLessonResourceSelectionRootPage(store, toRoute.params.classId, toRoute.params.lessonId);
    },
  },
  {
    name: LessonsPageNames.SELECTION,
    path: '/:classId/lessons/:lessonId/selection/topic/:topicId',
    handler: toRoute => {
      showLessonResourceSelectionTopicPage(
        store,
        toRoute.params.classId,
        toRoute.params.lessonId,
        toRoute.params.topicId
      );
    },
  },
  {
    name: LessonsPageNames.SELECTION_SEARCH,
    path: '/:classId/lessons/:lessonId/selection/search/:searchTerm',
    handler: toRoute => {
      showLessonSelectionSearchPage(
        store,
        toRoute.params.classId,
        toRoute.params.lessonId,
        toRoute.params.searchTerm
      );
    },
  },
  {
    name: LessonsPageNames.CONTENT_PREVIEW,
    path: '/:classId/lessons/:lessonId/preview/:contentId',
    handler: toRoute => {
      showLessonContentPreview(
        store,
        toRoute.params.classId,
        toRoute.params.lessonId,
        toRoute.params.contentId
      );
    },
  },
];

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
    path: '/:classId/topics/:channelId/item/:contentId/:userId/:attemptLogIndex/:interactionIndex',
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
  ...lessonRoutes,
  {
    path: '*',
    redirect: '/',
  },
];

class CoachToolsModule extends KolibriApp {
  get stateSetters() {
    return [setChannelInfo];
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

const coachToolsModule = new CoachToolsModule();

export { coachToolsModule as default };
