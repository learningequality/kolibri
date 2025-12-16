import store from 'kolibri/store';
import { showLessonResourceContentPreview } from '../modules/lessonResources/handlers';
import { PageNames } from '../constants';

import { useLessons } from '../composables/useLessons';

import LessonsRootPage from '../views/lessons/LessonsRootPage';
import LessonSummaryPage from '../views/lessons/LessonSummaryPage';
import LessonSelectionContentPreviewPage from '../views/lessons/LessonSelectionContentPreviewPage';
import LessonEditDetailsPage from '../views/lessons/LessonEditDetailsPage';
import LessonCreationPage from '../views/lessons/LessonCreationPage';

import { generateResourceHandler } from '../modules/resourceDetail/handlers';
import LessonResourceLearnersPage from '../views/lessons/reports/LessonResourceLearnersPage';
import LessonLearnerPage from '../views/lessons/reports/LessonLearnerPage.vue';
import LessonExerciseLearnersPage from '../views/lessons/reports/LessonExerciseLearnersPage.vue';
import {
  exerciseRootRedirectHandler,
  generateExerciseDetailHandler,
} from '../modules/exerciseDetail/handlers';
import LessonExerciseLearnerPage from '../views/lessons/reports/LessonExerciseLearnerPage.vue';
import { generateQuestionListHandler } from '../modules/questionList/handlers';
import ExerciseQuestionListPage from '../views/common/reports/ExerciseQuestionListPage.vue';
import {
  generateQuestionDetailHandler,
  questionRootRedirectHandler,
} from '../modules/questionDetail/handlers';
import LessonLearnerExercisePage from '../views/lessons/reports/LessonLearnerExercisePage.vue';
import QuestionLearnersPage from '../views/common/reports/QuestionLearnersPage.vue';
import SelectionIndex from '../views/common/resourceSelection/subPages/SelectionIndex.vue';
import SelectFromBookmarks from '../views/common/resourceSelection/subPages/SelectFromBookmarks.vue';
import SelectFromTopicTree from '../views/common/resourceSelection/subPages/SelectFromTopicTree.vue';
import ManageSelectedResources from '../views/common/resourceSelection/subPages/ManageSelectedResources.vue';
import PreviewSelectedResources from '../views/common/resourceSelection/subPages/PreviewSelectedResources/index.vue';
import LessonResourceSelection from '../views/lessons/LessonSummaryPage/sidePanels/LessonResourceSelection/index.vue';
import SearchFilters from '../views/lessons/LessonSummaryPage/sidePanels/LessonResourceSelection/subPages/SearchFilters.vue';
import SelectFromSearchResults from '../views/lessons/LessonSummaryPage/sidePanels/LessonResourceSelection/subPages/SelectFromSearchResults.vue';
import { classIdParamRequiredGuard, RouteSegments } from './utils';

const {
  OPTIONAL_CLASS,
  CLASS,
  LESSON,
  ALL_LESSONS,
  PREVIEW,
  RESOURCE,
  ALL_LEARNERS,
  LEARNER,
  EXERCISE,
  QUESTIONS,
  QUESTION,
  TRY,
  INTERACTION,
  OPTIONAL_GROUP,
} = RouteSegments;

const { showLessonsRootPage } = useLessons();

function defaultHandler() {
  store.dispatch('notLoading');
}

export default [
  {
    name: PageNames.LESSONS_ROOT,
    path: OPTIONAL_CLASS + ALL_LESSONS,
    component: LessonsRootPage,
    handler(toRoute, fromRoute, next) {
      if (classIdParamRequiredGuard(toRoute, PageNames.LESSONS_ROOT, next)) {
        return;
      }
      showLessonsRootPage(store, toRoute.params.classId);
    },
    meta: {
      titleParts: ['lessonsLabel', 'CLASS_NAME'],
    },
  },
  {
    name: PageNames.LESSON_CREATION_ROOT,
    path: CLASS + ALL_LESSONS + '/new',
    component: LessonCreationPage,
  },
  {
    name: PageNames.LESSON_SUMMARY,
    path: CLASS + LESSON + '/:tabId?',
    component: LessonSummaryPage,
    meta: {
      titleParts: ['LESSON_NAME', 'CLASS_NAME'],
    },
    children: [
      {
        name: PageNames.LESSON_SELECT_RESOURCES,
        path: 'select-resources/',
        component: LessonResourceSelection,
        redirect: 'select-resources/index',
        children: [
          {
            name: PageNames.LESSON_SELECT_RESOURCES_INDEX,
            path: 'index',
            component: SelectionIndex,
          },
          {
            name: PageNames.LESSON_SELECT_RESOURCES_BOOKMARKS,
            path: 'bookmarks',
            component: SelectFromBookmarks,
          },
          {
            name: PageNames.LESSON_SELECT_RESOURCES_TOPIC_TREE,
            path: 'topic-tree',
            component: SelectFromTopicTree,
          },
          {
            name: PageNames.LESSON_SELECT_RESOURCES_SEARCH,
            path: 'search',
            component: SearchFilters,
          },
          {
            name: PageNames.LESSON_SELECT_RESOURCES_SEARCH_RESULTS,
            path: 'search-results',
            component: SelectFromSearchResults,
          },
          {
            name: PageNames.LESSON_SELECT_RESOURCES_PREVIEW_SELECTION,
            path: 'preview-resources',
            component: ManageSelectedResources,
          },
          {
            name: PageNames.LESSON_SELECT_RESOURCES_PREVIEW_RESOURCE,
            path: 'preview',
            component: PreviewSelectedResources,
            props: toRoute => {
              const contentId = toRoute.query.contentId;
              return {
                contentId,
              };
            },
          },
        ],
      },
    ],
  },
  {
    name: PageNames.LESSON_EDIT_DETAILS,
    path: CLASS + LESSON + '/edit',
    component: LessonEditDetailsPage,
  },
  {
    name: PageNames.RESOURCE_CONTENT_PREVIEW,
    path: CLASS + LESSON + '/resource' + PREVIEW,
    component: LessonSelectionContentPreviewPage,
    props(data) {
      let backRoute;
      // If linked from the Reports section, go back there
      if (data.query.last === PageNames.LESSON_EDIT_DETAILS) {
        backRoute = {
          name: PageNames.LESSON_EDIT_DETAILS,
        };
      } else {
        backRoute = {
          name: PageNames.LESSON_SUMMARY,
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
  {
    name: PageNames.LESSON_RESOURCE_LEARNERS_REPORT,
    path: CLASS + LESSON + RESOURCE + ALL_LEARNERS,
    component: LessonResourceLearnersPage,
    handler: generateResourceHandler(['resourceId']),
    meta: {
      titleParts: ['RESOURCE_NAME', 'LESSON_NAME', 'CLASS_NAME'],
    },
  },
  {
    name: PageNames.LESSON_LEARNER_REPORT,
    path: CLASS + LESSON + LEARNER,
    component: LessonLearnerPage,
    handler: defaultHandler,
    meta: {
      titleParts: ['LEARNER_NAME', 'LESSON_NAME', 'CLASS_NAME'],
    },
  },
  {
    name: PageNames.LESSON_EXERCISE_LEARNERS_REPORT,
    path: CLASS + LESSON + EXERCISE + ALL_LEARNERS,
    component: LessonExerciseLearnersPage,
    handler: generateResourceHandler(['exerciseId']),
    meta: {
      titleParts: ['learnersLabel', 'EXERCISE_NAME', 'LESSON_NAME', 'CLASS_NAME'],
    },
  },
  {
    name: PageNames.LESSON_EXERCISE_LEARNER_PAGE_ROOT,
    path: CLASS + LESSON + EXERCISE + LEARNER,
    beforeEnter: (to, from, next) => {
      const { params, query } = to;
      return exerciseRootRedirectHandler(
        params,
        PageNames.LESSON_EXERCISE_LEARNER_REPORT,
        next,
        query,
      );
    },
    meta: {
      titleParts: ['LEARNER_NAME', 'EXERCISE_NAME', 'LESSON_NAME', 'CLASS_NAME'],
    },
  },
  {
    name: PageNames.LESSON_EXERCISE_LEARNER_REPORT,
    path: CLASS + LESSON + EXERCISE + LEARNER + TRY + QUESTION + INTERACTION,
    component: LessonExerciseLearnerPage,
    handler: generateExerciseDetailHandler(['learnerId', 'lessonId', 'exerciseId']),
    meta: {
      titleParts: ['LEARNER_NAME', 'EXERCISE_NAME', 'LESSON_NAME', 'CLASS_NAME'],
    },
  },
  {
    name: PageNames.LESSON_EXERCISE_QUESTIONS_REPORT,
    path: CLASS + LESSON + EXERCISE + QUESTIONS,
    component: ExerciseQuestionListPage,
    handler: generateQuestionListHandler(['lessonId', 'exerciseId']),
    meta: {
      titleParts: ['questionsLabel', 'EXERCISE_NAME', 'LESSON_NAME', 'CLASS_NAME'],
    },
  },
  {
    path: CLASS + LESSON + LEARNER + EXERCISE,
    name: PageNames.LESSON_LEARNER_EXERCISE_PAGE_ROOT,
    beforeEnter: (to, from, next) => {
      const { params } = to;
      return exerciseRootRedirectHandler(params, PageNames.LESSON_LEARNER_EXERCISE_REPORT, next);
    },
    meta: {
      titleParts: ['EXERCISE_NAME', 'LEARNER_NAME', 'LESSON_NAME', 'CLASS_NAME'],
    },
  },
  {
    name: PageNames.LESSON_LEARNER_EXERCISE_REPORT,
    path: CLASS + LESSON + LEARNER + EXERCISE + TRY + QUESTION + INTERACTION,
    component: LessonLearnerExercisePage,
    handler: generateExerciseDetailHandler(['learnerId', 'lessonId', 'exerciseId']),
    meta: {
      // Leaves out attempt and interaction numbers
      titleParts: ['LEARNER_NAME', 'EXERCISE_NAME', 'LESSON_NAME', 'CLASS_NAME'],
    },
  },
  {
    name: PageNames.LESSON_EXERCISE_QUESTION_PAGE_ROOT,
    path: CLASS + OPTIONAL_GROUP + LESSON + EXERCISE + QUESTION,
    beforeEnter: (to, from, next) => {
      const { params } = to;
      return questionRootRedirectHandler(params, PageNames.LESSON_EXERCISE_QUESTION_REPORT, next);
    },
  },
  {
    name: PageNames.LESSON_EXERCISE_QUESTION_REPORT,
    path: CLASS + OPTIONAL_GROUP + LESSON + EXERCISE + QUESTION + LEARNER + INTERACTION,
    component: QuestionLearnersPage,
    handler: generateQuestionDetailHandler(['groupId', 'lessonId', 'exerciseId', 'questionId']),
    meta: {
      // Leaves out info on question
      titleParts: ['questionLabel', 'EXERCISE_NAME', 'LESSON_NAME', 'GROUP_NAME', 'CLASS_NAME'],
    },
  },
];
