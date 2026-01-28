import store from 'kolibri/store';
import { PageNames } from '../constants';
import { useCourses } from '../composables/useCourses';
import CoursesRootPage from '../views/courses/CoursesRootPage.vue';
import AssignCourseSidePanel from '../views/courses/sidePanels/AssignCourse/index.vue';
import CourseDetailsSubpage from '../views/courses/sidePanels/AssignCourse/subpages/CourseDetails.vue';
import PreviewLearnersSubpage from '../views/courses/sidePanels/AssignCourse/subpages/PreviewLearners.vue';
import SelectRecipientsSubpage from '../views/courses/sidePanels/AssignCourse/subpages/SelectRecipients.vue';
import AssignCourseIndexSubpage from '../views/courses/sidePanels/AssignCourse/subpages/AssignCourseIndex.vue';
import { classIdParamRequiredGuard, RouteSegments } from './utils';

const { OPTIONAL_CLASS, ALL_COURSES } = RouteSegments;
const { showCoursesRootPage } = useCourses();

export default [
  {
    name: PageNames.COURSES_ROOT,
    path: OPTIONAL_CLASS + ALL_COURSES,
    component: CoursesRootPage,
    handler(toRoute, fromRoute, next) {
      if (classIdParamRequiredGuard(toRoute, PageNames.COURSES_ROOT, next)) {
        return;
      }
      showCoursesRootPage(store, toRoute.params.classId);
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
