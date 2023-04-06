import { PageNames } from '../constants';

export default {
  classes: {
    name: PageNames.COACH_CLASS_LIST_PAGE,
    path: '/classes',
  },
  classHome: {
    name: PageNames.HOME_PAGE,
    path: '/:classId/home',
  },
  plan: {
    name: PageNames.PLAN_PAGE,
    path: '/:classId/plan',
    redirect: '/:classId/plan/lessons',
  },
  reports: {
    name: PageNames.REPORTS_PAGE,
    path: '/:classId/reports',
  },
};
