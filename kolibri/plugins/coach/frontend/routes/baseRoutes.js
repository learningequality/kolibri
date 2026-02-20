import { PageNames } from '../constants';

export default {
  classHome: {
    name: PageNames.HOME_PAGE,
    path: '/:classId?/home',
  },
  courses: {
    name: PageNames.COURSES_ROOT,
    path: '/:classId?/courses',
  },
  lessons: {
    name: PageNames.LESSONS_ROOT,
    path: '/:classId?/lessons',
  },
  quizzes: {
    name: PageNames.EXAMS_ROOT,
    path: '/:classId?/quizzes',
  },
  learners: {
    name: PageNames.LEARNERS_ROOT,
    path: '/:classId?/learners',
  },
  groups: {
    name: PageNames.GROUPS_ROOT,
    path: '/:classId?/groups',
  },
};
