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

import LessonsRootPage from '../views/plan/LessonsRootPage';
import LessonSummaryPage from '../views/plan/LessonSummaryPage';
import LessonResourceSelectionPage from '../views/plan/LessonResourceSelectionPage';
import PlanLessonSelectionContentPreview from '../views/plan/PlanLessonSelectionContentPreview';

const CLASS = '/:classId/plan';
const LESSON = '/lessons/:lessonId';
const ALL_LESSONS = '/lessons';
const SELECTION = '/selection';
const TOPIC = '/topic/:topicId';
const SEARCH = '/search/:searchTerm';
const PREVIEW = '/preview/:contentId';

function path(...args) {
  return args.join('');
}

export default [
  {
    name: LessonsPageNames.PLAN_LESSONS_ROOT,
    path: path(CLASS, ALL_LESSONS),
    component: LessonsRootPage,
    handler(toRoute) {
      showLessonsRootPage(store, toRoute.params.classId);
    },
    meta: {
      titleParts: ['lessonsLabel', 'CLASS_NAME'],
    },
  },
  {
    name: LessonsPageNames.SUMMARY,
    path: path(CLASS, LESSON),
    component: LessonSummaryPage,
    handler(toRoute) {
      return showLessonSummaryPage(store, toRoute.params);
    },
    meta: {
      titleParts: ['LESSON_NAME', 'CLASS_NAME'],
    },
  },
  {
    name: LessonsPageNames.SELECTION_ROOT,
    path: path(CLASS, LESSON, SELECTION),
    component: LessonResourceSelectionPage,
    handler(toRoute) {
      showLessonResourceSelectionRootPage(store, toRoute.params);
    },
  },
  {
    name: LessonsPageNames.SELECTION,
    path: path(CLASS, LESSON, SELECTION, TOPIC),
    component: LessonResourceSelectionPage,
    handler(toRoute, fromRoute) {
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
    path: path(CLASS, LESSON, SELECTION, SEARCH),
    component: LessonResourceSelectionPage,
    handler(toRoute) {
      showLessonResourceSearchPage(store, toRoute.params, toRoute.query);
    },
  },
  {
    name: LessonsPageNames.SELECTION_CONTENT_PREVIEW,
    path: path(CLASS, LESSON, SELECTION, PREVIEW),
    component: PlanLessonSelectionContentPreview,
    handler(toRoute) {
      showLessonSelectionContentPreview(store, toRoute.params, toRoute.query);
    },
  },
  {
    name: LessonsPageNames.RESOURCE_CONTENT_PREVIEW,
    path: path(CLASS, LESSON, '/resource', PREVIEW),
    handler(toRoute) {
      showLessonResourceContentPreview(store, toRoute.params);
    },
  },
];
