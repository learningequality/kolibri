import { get } from '@vueuse/core';
import store from 'kolibri/store';
import router from 'kolibri/router';
import { ClassesPageNames, PageNames } from '../constants';
import { showLessonPlaylist } from '../modules/lessonPlaylist/handlers';
import { showClassAssignmentsPage } from '../modules/classAssignments/handlers';
import { showAllClassesPage } from '../modules/classes/handlers';
import { showExam } from '../modules/examViewer/handlers';
import { showExamReport } from '../modules/examReportViewer/handlers';
import { inClasses } from '../composables/useCoreLearn';
import ExamPage from '../views/ExamPage/index.vue';
import CourseRootPage from '../views/CourseRootPage.vue';
import CourseUnitView from '../views/CourseUnitView/index.vue';
import CourseWelcomePage from '../views/CourseWelcomePage';
import ExamReportViewer from '../views/LearnExamReportViewer';
import AllClassesPage from '../views/classes/AllClassesPage';
import ClassAssignmentsPage from '../views/classes/ClassAssignmentsPage';
import LessonPlaylistPage from '../views/classes/LessonPlaylistPage';

function noClassesGuard() {
  const { canAccessUnassignedContent } = store.getters;
  if (!get(inClasses) && canAccessUnassignedContent) {
    // If there are no memberships and it is allowed, redirect to library page
    return router.replace({ name: PageNames.LIBRARY });
  }
  // Otherwise return nothing
  return;
}

export default [
  {
    name: ClassesPageNames.ALL_CLASSES,
    path: '/classes',
    handler: () => {
      return noClassesGuard() || showAllClassesPage(store);
    },
    component: AllClassesPage,
  },
  {
    name: ClassesPageNames.CLASS_ASSIGNMENTS,
    path: '/classes/:classId',
    props: route => {
      const classId = route.params.classId;
      return {
        classId,
      };
    },
    handler: toRoute => {
      const { classId } = toRoute.params;
      return noClassesGuard() || showClassAssignmentsPage(store, classId);
    },
    component: ClassAssignmentsPage,
  },
  {
    name: ClassesPageNames.LESSON_PLAYLIST,
    path: '/classes/:classId/lesson/:lessonId',
    handler: toRoute => {
      const { classId, lessonId } = toRoute.params;
      return noClassesGuard() || showLessonPlaylist(store, { classId, lessonId });
    },
    component: LessonPlaylistPage,
  },
  {
    name: ClassesPageNames.EXAM_VIEWER,
    path: '/classes/:classId/exam/:examId/:questionNumber',
    handler: (toRoute, fromRoute) => {
      if (noClassesGuard()) {
        return noClassesGuard();
      }
      const alreadyOnQuiz =
        fromRoute.name === ClassesPageNames.EXAM_VIEWER &&
        toRoute.params.examId === fromRoute.params.examId &&
        toRoute.params.classId === fromRoute.params.classId;
      showExam(store, toRoute.params, alreadyOnQuiz, toRoute);
    },
    component: ExamPage,
  },
  {
    name: ClassesPageNames.EXAM_REPORT_VIEWER,
    path: '/classes/:classId/examReport/:examId/:tryIndex/:questionNumber/:questionInteraction',
    handler: toRoute => {
      if (noClassesGuard()) {
        return noClassesGuard();
      }
      showExamReport(store, toRoute.params);
    },
    component: ExamReportViewer,
  },
  {
    path: '/course',
    component: CourseRootPage,
    redirect: '/',
    beforeEnter: (to, from, next) => {
      if (noClassesGuard()) {
        return;
      }
      next();
    },
    children: [
      {
        name: PageNames.COURSE_WELCOME,
        path: ':courseSessionId([a-f0-9]{32})/welcome',
        component: CourseWelcomePage,
        props: true,
      },
      {
        name: PageNames.COURSE_CONTENT__RESOURCE,
        path: ':courseId([a-f0-9]{32})/u/:unitId([a-f0-9]{32})/l/:lessonId([a-f0-9]{32})/r/:resourceId([a-f0-9]{32})',
        component: CourseUnitView,
        props: true,
      },
      {
        name: PageNames.COURSE_CONTENT__LESSON,
        path: ':courseId([a-f0-9]{32})/u/:unitId([a-f0-9]{32})/l/:lessonId([a-f0-9]{32})',
        component: CourseUnitView,
        props: true,
      },
      {
        name: PageNames.COURSE_CONTENT_TEST,
        path: ':courseId([a-f0-9]{32})/u/:unitId([a-f0-9]{32})/t/:testType(pre|post)',
        component: CourseUnitView,
        props: true,
      },
      {
        name: PageNames.COURSE_CONTENT__UNIT,
        path: ':courseId([a-f0-9]{32})/u/:unitId([a-f0-9]{32})',
        component: CourseUnitView,
        props: true,
      },
      {
        name: PageNames.COURSE_CONTENT__COURSE,
        path: ':courseId([a-f0-9]{32})',
        component: CourseUnitView,
        props: true,
      },
    ],
  },
];
