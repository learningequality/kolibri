import store from 'kolibri/store';
import { PageNames } from '../constants';
import CoursesRootPage from '../views/courses/CoursesRootPage.vue';
import CourseSummaryPage from '../views/courses/CourseSummaryPage.vue';
import UnitDetailPage from '../views/courses/UnitDetailPage.vue';
import AssignCourseSidePanel from '../views/courses/sidePanels/AssignCourse/index.vue';
import CourseDetailsSubpage from '../views/courses/sidePanels/AssignCourse/subpages/CourseDetails.vue';
import SelectRecipientsSubpage from '../views/courses/sidePanels/AssignCourse/subpages/SelectRecipients.vue';
import AssignCourseIndexSubpage from '../views/courses/sidePanels/AssignCourse/subpages/AssignCourseIndex.vue';
import { classIdParamRequiredGuard, RouteSegments, COMPACT_UUID_PATTERN } from './utils';

const { OPTIONAL_CLASS, ALL_COURSES, CLASS, COURSE_SESSION } = RouteSegments;

const COURSE_META = { titleParts: ['COURSE_NAME', 'CLASS_NAME'] };

// CourseSummaryPage has a <router-view> for the assign-course side panel. Tab and panel child
// routes must not render CourseSummaryPage again, so they use this no-op component instead.
// $route still updates (giving CourseSummaryPage the route name/params it needs to react).
const NoRender = { render: () => null };

export default [
  {
    name: PageNames.COURSE_SUMMARY,
    path: CLASS + COURSE_SESSION,
    component: CourseSummaryPage,
    handler() {
      store.dispatch('notLoading');
    },
    redirect: to => ({
      name: PageNames.COURSE_SUMMARY_UNITS,
      params: to.params,
    }),
    meta: COURSE_META,
    children: [
      {
        name: PageNames.COURSE_SUMMARY_UNITS,
        path: 'units',
        component: NoRender,
        meta: COURSE_META,
      },
      {
        name: PageNames.COURSE_SUMMARY_LEARNERS,
        path: 'learners',
        component: NoRender,
        meta: COURSE_META,
        children: [
          {
            name: PageNames.COURSE_SUMMARY_LEARNER,
            path: `:learnerId(${COMPACT_UUID_PATTERN})`,
            component: NoRender,
            meta: COURSE_META,
          },
        ],
      },
      {
        name: PageNames.COURSE_SUMMARY_OBJECTIVES,
        path: 'objectives',
        component: NoRender,
        meta: COURSE_META,
        children: [
          {
            name: PageNames.COURSE_SUMMARY_OBJECTIVE,
            path: `:objectiveId(${COMPACT_UUID_PATTERN})`,
            component: NoRender,
            meta: COURSE_META,
          },
        ],
      },
      {
        name: PageNames.COURSE_SUMMARY_ASSIGN,
        path: 'assign-course/',
        component: AssignCourseSidePanel,
        children: [
          {
            name: PageNames.COURSE_SUMMARY_ASSIGN_COURSE_DETAILS,
            path: ':courseId/course-details',
            component: CourseDetailsSubpage,
          },
          {
            name: PageNames.COURSE_SUMMARY_ASSIGN_SELECT_RECIPIENTS,
            path: 'select-recipients',
            component: SelectRecipientsSubpage,
          },
        ],
      },
    ],
  },
  {
    name: PageNames.UNIT_DETAIL,
    path: CLASS + COURSE_SESSION + `/units/:unitContentnodeId(${COMPACT_UUID_PATTERN})`,
    component: UnitDetailPage,
    redirect: to => ({
      name: PageNames.UNIT_DETAIL_LESSONS,
      params: to.params,
    }),
    handler() {
      store.dispatch('notLoading');
    },
    meta: {
      titleParts: ['COURSE_NAME', 'CLASS_NAME'],
    },
    children: [
      {
        name: PageNames.UNIT_DETAIL_LESSONS,
        path: 'lessons',
        component: NoRender,
        meta: { titleParts: ['COURSE_NAME', 'CLASS_NAME'] },
      },
      {
        name: PageNames.UNIT_DETAIL_OBJECTIVES,
        path: 'objectives',
        component: NoRender,
        meta: { titleParts: ['COURSE_NAME', 'CLASS_NAME'] },
      },
    ],
  },
  {
    name: PageNames.COURSES_ROOT,
    path: OPTIONAL_CLASS + ALL_COURSES,
    component: CoursesRootPage,
    handler(toRoute, fromRoute, next) {
      if (classIdParamRequiredGuard(toRoute, PageNames.COURSES_ROOT, next)) {
        return;
      }
    },
    meta: {
      titleParts: ['COURSES_LABEL', 'CLASS_NAME'],
    },
    children: [
      {
        name: PageNames.COURSES_ASSIGN,
        path: 'assign-course/',
        component: AssignCourseSidePanel,
        redirect: 'assign-course/index',
        // Subpages that will be rendered inside the AssignCourse side panel
        children: [
          {
            name: PageNames.COURSES_ASSIGN_INDEX,
            path: 'index',
            component: AssignCourseIndexSubpage,
          },
          {
            name: PageNames.COURSES_ASSIGN_COURSE_DETAILS,
            path: ':courseId/course-details',
            component: CourseDetailsSubpage,
          },
          {
            name: PageNames.COURSES_ASSIGN_SELECT_RECIPIENTS,
            path: 'select-recipients',
            component: SelectRecipientsSubpage,
          },
        ],
      },
    ],
  },
];
