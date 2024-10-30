import store from 'kolibri.coreVue.vuex.store';
import {
  showLessonResourceContentPreview,
  showLessonResourceSelectionRootPage,
  showLessonResourceSelectionTopicPage,
  showLessonSelectionContentPreview,
  showLessonResourceSearchPage,
  showLessonResourceBookmarks,
  showLessonResourceBookmarksMain,
} from '../modules/lessonResources/handlers';
import { showLessonSummaryPage } from '../modules/lessonSummary/handlers';
import { LessonsPageNames } from '../constants/lessonsConstants';
import { PageNames } from '../constants';

import { useLessons } from '../composables/useLessons';

import LessonsRootPage from '../views/lessons/LessonsRootPage';
import LessonSummaryPage from '../views/lessons/LessonSummaryPage';
import LessonResourceSelectionPage from '../views/plan/LessonResourceSelectionPage';
import PlanLessonSelectionContentPreview from '../views/plan/PlanLessonSelectionContentPreview';
import LessonEditDetailsPage from '../views/plan/LessonEditDetailsPage';
import LessonCreationPage from '../views/plan/LessonCreationPage';
import EditLessonDetails from '../views/plan/LessonEditDetailsPage/EditLessonDetails';
import PreviewSelectedResources from '../views/plan/LessonContentPreviewPage/PreviewSelectedResources';
import LessonResourceSelection from '../views/plan/LessonResourceSelectionPage/LessonResourceSelection';
import { classIdParamRequiredGuard } from './utils';

const OPTIONAL_CLASS = '/:classId?';
const CLASS = '/:classId';
const LESSON = '/lessons/:lessonId';
const ALL_LESSONS = '/lessons';
const ALL_LESSONS_TEMP = '/lessonstemp';
const LESSONS_TEMP = '/lessonstemp/:lessonId';
const SELECTION = '/selection';
const TOPIC = '/topic/:topicId';
const SEARCH = '/search/:searchTerm';
const PREVIEW = '/preview/:contentId';

function path(...args) {
  return args.join('');
}

const { showLessonsRootPage } = useLessons();

export default [
  {
    name: LessonsPageNames.LESSONS_ROOT,
    path: path(OPTIONAL_CLASS, ALL_LESSONS),
    component: LessonsRootPage,
    handler(toRoute, fromRoute, next) {
      if (classIdParamRequiredGuard(toRoute, LessonsPageNames.LESSONS_ROOT, next)) {
        return;
      }
      showLessonsRootPage(store, toRoute.params.classId);
    },
    meta: {
      titleParts: ['lessonsLabel', 'CLASS_NAME'],
    },
  },
  {
    name: LessonsPageNames.LESSONS_ROOT_BETTER,
    path: path(OPTIONAL_CLASS, ALL_LESSONS_TEMP),
    component: LessonsRootPage,
    handler(toRoute, fromRoute, next) {
      if (classIdParamRequiredGuard(toRoute, LessonsPageNames.LESSONS_ROOT_BETTER, next)) {
        return;
      }
      showLessonsRootPage(store, toRoute.params.classId);
    },
    meta: {
      titleParts: ['lessonsLabel', 'CLASS_NAME'],
    },
  },
  {
    name: LessonsPageNames.LESSON_CREATION_ROOT,
    path: path(CLASS, ALL_LESSONS, '/new'),
    component: LessonCreationPage,
  },
  {
    name: LessonsPageNames.LESSON_CREATION_ROOT_BETTER,
    path: path(CLASS, LESSONS_TEMP, '/edit'),
    component: LessonCreationPage,
    children: [
      {
        name: PageNames.LESSON_EDIT_DETAILS,
        path: 'details/',
        component: EditLessonDetails,
        props: {
          text: 'test',
        },
      },
      {
        name: PageNames.LESSON_SELECT_RESOURCES,
        path: 'select-resources/:topicId?',
        component: LessonResourceSelection,
      },
      {
        name: PageNames.LESSON_PREVIEW_SELECTED_RESOURCES,
        path: 'preview-resources/',
        component: PreviewSelectedResources,
      },
      {
        name: PageNames.LESSON_PREVIEW_RESOURCE,
        path: 'preview-resources/:nodeId',
        component: PreviewSelectedResources,
      },
    ],
  },
  {
    name: LessonsPageNames.SUMMARY,
    path: path(CLASS, LESSON, '/:tabId?'),
    component: LessonSummaryPage,
    handler(toRoute, fromRoute) {
      if (
        fromRoute.name !== LessonsPageNames.SUMMARY ||
        toRoute.params.lessonId !== fromRoute.params.lessonId
      ) {
        return showLessonSummaryPage(store, toRoute.params);
      }
      store.dispatch('notLoading');
    },
    meta: {
      titleParts: ['LESSON_NAME', 'CLASS_NAME'],
    },
  },
  {
    name: LessonEditDetailsPage.name,
    path: path(CLASS, LESSON, '/edit'),
    component: LessonEditDetailsPage,
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
          resources: store.state.lessonSummary.workingResources,
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
    name: LessonsPageNames.LESSON_SELECTION_BOOKMARKS,
    path: path(CLASS, LESSON, SELECTION, TOPIC),
    component: LessonResourceSelectionPage,
    handler(toRoute, fromRoute) {
      let preHandlerPromise;
      if (fromRoute.name === LessonsPageNames.SELECTION_CONTENT_PREVIEW) {
        preHandlerPromise = store.dispatch('lessonSummary/saveLessonResources', {
          lessonId: toRoute.params.lessonId,
          resources: store.state.lessonSummary.workingResources,
        });
      } else {
        preHandlerPromise = Promise.resolve();
      }
      preHandlerPromise.then(() => {
        showLessonResourceBookmarks(store, toRoute.params, toRoute.query);
      });
    },
  },
  {
    name: LessonsPageNames.LESSON_SELECTION_BOOKMARKS_MAIN,
    path: path(CLASS, LESSON, SELECTION),
    component: LessonResourceSelectionPage,
    handler(toRoute) {
      showLessonResourceBookmarksMain(store, toRoute.params, toRoute.query);
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
    component: PlanLessonSelectionContentPreview,
    props(data) {
      let backRoute;
      // If linked from the Reports section, go back there
      if (data.query.last === 'LessonReportEditDetailsPage') {
        backRoute = {
          name: 'LessonReportEditDetailsPage',
        };
      } else {
        backRoute = {
          name: LessonsPageNames.SUMMARY,
        };
      }
      return {
        showSelectOptions: false,
        backRoute,
      };
    },
    handler(toRoute) {
      showLessonResourceContentPreview(store, toRoute.params);
    },
  },
];
