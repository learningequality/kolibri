import store from 'kolibri.coreVue.vuex.store';
import {
  showLessonResourceContentPreview,
  showLessonResourceSelectionRootPage,
  showLessonResourceSelectionTopicPage,
  showLessonSelectionContentPreview,
} from '../modules/lessonResources/handlers';
import { showLessonsRootPage } from '../modules/lessonsRoot/handlers';
import { showLessonSummaryPage } from '../modules/lessonSummary/handlers';
import { showLessonResourceUserReportPage } from '../modules/exerciseDetail/handlers';
import { showLessonResourceUserSummaryPage } from '../modules/lessonResourceUserSummary/handlers';
import { LessonsPageNames } from '../constants/lessonsConstants';

export default [
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
    handler: toRoute => {
      return showLessonSummaryPage(store, toRoute.params);
    },
  },
  {
    name: LessonsPageNames.RESOURCE_USER_SUMMARY,
    path: '/:classId/lessons/:lessonId/resource/:contentId',
    handler: toRoute => {
      showLessonResourceUserSummaryPage(store, toRoute.params);
    },
  },
  {
    name: LessonsPageNames.RESOURCE_USER_REPORT_ROOT,
    path: '/:classId/lessons/:lessonId/resource/:contentId/user/:userId',
    redirect: '/:classId/lessons/:lessonId/resource/:contentId/user/:userId/0/0',
  },
  {
    name: LessonsPageNames.RESOURCE_USER_REPORT,
    path:
      '/:classId/lessons/:lessonId/resource/:contentId/user/:userId/:attemptLogIndex/:interactionIndex',
    handler: toRoute => {
      showLessonResourceUserReportPage(store, toRoute.params);
    },
  },
  {
    name: LessonsPageNames.SELECTION_ROOT,
    path: '/:classId/lessons/:lessonId/selection',
    handler: toRoute => {
      showLessonResourceSelectionRootPage(store, toRoute.params);
    },
  },
  {
    name: LessonsPageNames.SELECTION,
    path: '/:classId/lessons/:lessonId/selection/topic/:topicId',
    handler: toRoute => {
      showLessonResourceSelectionTopicPage(store, toRoute.params);
    },
  },
  {
    name: LessonsPageNames.SELECTION_CONTENT_PREVIEW,
    path: '/:classId/lessons/:lessonId/selection/preview/:contentId',
    handler: toRoute => {
      showLessonSelectionContentPreview(store, toRoute.params);
    },
  },
  {
    name: LessonsPageNames.RESOURCE_CONTENT_PREVIEW,
    path: '/:classId/lessons/:lessonId/resource/preview/:contentId',
    handler: toRoute => {
      showLessonResourceContentPreview(store, toRoute.params);
    },
  },
];
