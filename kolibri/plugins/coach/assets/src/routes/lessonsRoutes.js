import store from 'kolibri.coreVue.vuex.store';
import router from 'kolibri.coreVue.router';
import {
  showLessonResourceContentPreview,
  showLessonResourceSelectionRootPage,
  showLessonResourceSelectionTopicPage,
  showLessonSelectionContentPreview,
  showLessonSummaryPage,
  showLessonsRootPage,
} from '../state/actions/lessons';
import {
  showLessonResourceUserReportPage,
  showLessonResourceUserSummaryPage,
} from '../state/actions/lessonReportsActions';
import { LessonsPageNames } from '../constants/lessonsConstants';

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
    handler: (toRoute, fromRoute) => {
      // If switching classes while viewing a Lesson summary, redirect to the lessons list
      // TODO add this check to all lessonId-based URLs
      if (fromRoute.name !== null && toRoute.params.classId !== fromRoute.params.classId) {
        return redirectToLessonsList(toRoute.params.classId);
      } else {
        return showLessonSummaryPage(store, toRoute.params.classId, toRoute.params.lessonId);
      }
    },
  },
  {
    name: LessonsPageNames.RESOURCE_USER_SUMMARY,
    path: '/:classId/lessons/:lessonId/resource/:contentId',
    handler: toRoute => {
      showLessonResourceUserSummaryPage(
        store,
        toRoute.params.classId,
        toRoute.params.lessonId,
        toRoute.params.contentId
      );
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
      showLessonResourceUserReportPage(
        store,
        toRoute.params.classId,
        toRoute.params.lessonId,
        toRoute.params.contentId,
        toRoute.params.userId,
        Number(toRoute.params.attemptLogIndex),
        Number(toRoute.params.interactionIndex)
      );
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
    name: LessonsPageNames.SELECTION_CONTENT_PREVIEW,
    path: '/:classId/lessons/:lessonId/selection/preview/:contentId',
    handler: toRoute => {
      showLessonSelectionContentPreview(
        store,
        toRoute.params.classId,
        toRoute.params.lessonId,
        toRoute.params.contentId
      );
    },
  },
  {
    name: LessonsPageNames.RESOURCE_CONTENT_PREVIEW,
    path: '/:classId/lessons/:lessonId/resource/preview/:contentId',
    handler: toRoute => {
      showLessonResourceContentPreview(
        store,
        toRoute.params.classId,
        toRoute.params.lessonId,
        toRoute.params.contentId
      );
    },
  },
];
