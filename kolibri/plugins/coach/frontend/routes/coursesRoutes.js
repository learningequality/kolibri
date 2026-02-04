import { PageNames } from '../constants';
import CoursesRootPage from '../views/courses/CoursesRootPage.vue';
import CourseSummaryPage from '../views/courses/CourseSummaryPage.vue';
import AssignCourseSidePanel from '../views/courses/sidePanels/AssignCourse/index.vue';
import CourseDetailsSubpage from '../views/courses/sidePanels/AssignCourse/subpages/CourseDetails.vue';
import PreviewLearnersSubpage from '../views/courses/sidePanels/AssignCourse/subpages/PreviewLearners.vue';
import SelectRecipientsSubpage from '../views/courses/sidePanels/AssignCourse/subpages/SelectRecipients.vue';
import AssignCourseIndexSubpage from '../views/courses/sidePanels/AssignCourse/subpages/AssignCourseIndex.vue';
import { classIdParamRequiredGuard, RouteSegments } from './utils';

const { OPTIONAL_CLASS, ALL_COURSES, CLASS, COURSE } = RouteSegments;

export default [
  {
    name: PageNames.COURSE_SUMMARY,
    path: CLASS + COURSE,
    component: CourseSummaryPage,
    meta: {
      titleParts: ['COURSE_NAME', 'CLASS_NAME'],
    },
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
            path: 'course-details',
            component: CourseDetailsSubpage,
          },
          {
            name: PageNames.COURSES_ASSIGN_SELECT_RECIPIENTS,
            path: 'select-recipients',
            component: SelectRecipientsSubpage,
          },
          {
            name: PageNames.COURSES_ASSIGN_PREVIEW_LEARNERS,
            path: 'preview-learners',
            component: PreviewLearnersSubpage,
          },
        ],
      },
    ],
  },
];
