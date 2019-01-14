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
import { LessonsPageNames } from '../constants/lessonsConstants';

import LessonsRootPage from '../views/lessons/LessonsRootPage';
import LessonSummaryPage from '../views/lessons/LessonSummaryPage';
import LessonResourceSelectionPage from '../views/lessons/LessonResourceSelectionPage';

export default [
  {
    name: LessonsPageNames.ROOT,
    path: '/:classId/plan/lessons',
    component: LessonsRootPage,
    handler(to) {
      store.commit('USE_OLD_INDEX_STYLE', false);
      showLessonsRootPage(store, to.params.classId);
    },
  },
  {
    name: LessonsPageNames.SUMMARY,
    path: '/:classId/plan/lessons/:lessonId',
    component: LessonSummaryPage,
    handler: toRoute => {
      store.commit('USE_OLD_INDEX_STYLE', false);
      return showLessonSummaryPage(store, toRoute.params);
    },
  },
  {
    name: LessonsPageNames.SELECTION_ROOT,
    path: '/:classId/plan/lessons/:lessonId/selection',
    component: LessonResourceSelectionPage,
    handler: toRoute => {
      store.commit('USE_OLD_INDEX_STYLE', false);
      showLessonResourceSelectionRootPage(store, toRoute.params);
    },
  },
  {
    name: LessonsPageNames.SELECTION,
    path: '/:classId/plan/lessons/:lessonId/selection/topic/:topicId',
    component: LessonResourceSelectionPage,
    handler: (toRoute, fromRoute) => {
      store.commit('USE_OLD_INDEX_STYLE', false);
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
    path: '/:classId/plan/lessons/:lessonId/selection/search/:searchTerm',
    component: LessonResourceSelectionPage,
    handler: toRoute => {
      store.commit('USE_OLD_INDEX_STYLE', false);
      showLessonResourceSearchPage(store, toRoute.params, toRoute.query);
    },
  },
  {
    name: LessonsPageNames.SELECTION_CONTENT_PREVIEW,
    path: '/:classId/plan/lessons/:lessonId/selection/preview/:contentId',
    handler: toRoute => {
      store.commit('USE_OLD_INDEX_STYLE', false);
      showLessonSelectionContentPreview(store, toRoute.params, toRoute.query);
    },
  },
  {
    name: LessonsPageNames.RESOURCE_CONTENT_PREVIEW,
    path: '/:classId/plan/lessons/:lessonId/resource/preview/:contentId',
    handler: toRoute => {
      store.commit('USE_OLD_INDEX_STYLE', false);
      showLessonResourceContentPreview(store, toRoute.params);
    },
  },
];
