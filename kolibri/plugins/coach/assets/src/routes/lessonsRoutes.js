import store from 'kolibri.coreVue.vuex.store';
import {
  showLessonResourceContentPreview,
  showLessonResourceSelectionRootPage,
  showLessonResourceSelectionTopicPage,
  showLessonSelectionContentPreview,
  showLessonResourceSearchPage,
} from '../modules/lessonResources/handlers';
import { showLessonsRootPage } from '../modules/lessonsRoot/handlers';
import { showLessonSummaryPage } from '../modules/lessonSummary/handlers';
import { showLessonResourceUserReportPage } from '../modules/exerciseDetail/handlers';
import { showLessonResourceUserSummaryPage } from '../modules/lessonResourceUserSummary/handlers';
import { LessonsPageNames } from '../constants/lessonsConstants';
import LessonResourceSelectionPage from '../views/lessons/LessonResourceSelectionPage';

export default [
  {
    name: LessonsPageNames.ROOT,
    path: '/old/:classId/lessons',
    handler: toRoute => {
      store.commit('USE_OLD_INDEX_STYLE', true);
      showLessonsRootPage(store, toRoute.params.classId);
    },
  },
  {
    name: LessonsPageNames.SUMMARY,
    path: '/old/:classId/lessons/:lessonId',
    handler: toRoute => {
      store.commit('USE_OLD_INDEX_STYLE', true);
      return showLessonSummaryPage(store, toRoute.params);
    },
  },
  {
    name: LessonsPageNames.RESOURCE_USER_SUMMARY,
    path: '/old/:classId/lessons/:lessonId/resource/:contentId',
    handler: toRoute => {
      store.commit('USE_OLD_INDEX_STYLE', true);
      showLessonResourceUserSummaryPage(store, toRoute.params);
    },
  },
  {
    name: LessonsPageNames.RESOURCE_USER_REPORT_ROOT,
    path: '/old/:classId/lessons/:lessonId/resource/:contentId/user/:userId',
    redirect: '/old/:classId/lessons/:lessonId/resource/:contentId/user/:userId/0/0',
  },
  {
    name: LessonsPageNames.RESOURCE_USER_REPORT,
    path:
      '/old/:classId/lessons/:lessonId/resource/:contentId/user/:userId/:attemptLogIndex/:interactionIndex',
    handler: toRoute => {
      store.commit('USE_OLD_INDEX_STYLE', true);
      showLessonResourceUserReportPage(store, toRoute.params);
    },
  },
  {
    name: LessonsPageNames.SELECTION_ROOT,
    path: '/old/:classId/lessons/:lessonId/selection',
    component: LessonResourceSelectionPage,
    handler: toRoute => {
      store.commit('USE_OLD_INDEX_STYLE', true);
      showLessonResourceSelectionRootPage(store, toRoute.params);
    },
  },
  {
    name: LessonsPageNames.SELECTION,
    path: '/old/:classId/lessons/:lessonId/selection/topic/:topicId',
    component: LessonResourceSelectionPage,
    handler: (toRoute, fromRoute) => {
      store.commit('USE_OLD_INDEX_STYLE', true);
      // HACK if last page was LessonContentPreviewPage, then we need to make sure
      // to immediately autosave just in case a change was made there. This gets
      // called whether or not a change is made, because we don't track changes
      // enough steps back.
      let preHandlerPromise;
      if (fromRoute.name === LessonsPageNames.SELECTION_CONTENT_PREVIEW) {
        preHandlerPromise = store.dispatch('lessonSummary/saveLessonResources', {
          lessonId: toRoute.params.lessonId,
          resourceIds: store.state.lessonSummary.workingResources,
        });
      } else {
        preHandlerPromise = Promise.resolve();
      }
      preHandlerPromise.then(() => {
        showLessonResourceSelectionTopicPage(store, toRoute.params);
      });
    },
  },
  {
    name: LessonsPageNames.SELECTION_SEARCH,
    path: '/old/:classId/lessons/:lessonId/selection/search/:searchTerm',
    component: LessonResourceSelectionPage,
    handler: toRoute => {
      store.commit('USE_OLD_INDEX_STYLE', true);
      showLessonResourceSearchPage(store, toRoute.params, toRoute.query);
    },
  },
  {
    name: LessonsPageNames.SELECTION_CONTENT_PREVIEW,
    path: '/old/:classId/lessons/:lessonId/selection/preview/:contentId',
    handler: toRoute => {
      store.commit('USE_OLD_INDEX_STYLE', true);
      showLessonSelectionContentPreview(store, toRoute.params, toRoute.query);
    },
  },
  {
    name: LessonsPageNames.RESOURCE_CONTENT_PREVIEW,
    path: '/old/:classId/lessons/:lessonId/resource/preview/:contentId',
    handler: toRoute => {
      store.commit('USE_OLD_INDEX_STYLE', true);
      showLessonResourceContentPreview(store, toRoute.params);
    },
  },
];
