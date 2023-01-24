import { PageNames } from '../constants';

export default [
  {
    name: PageNames.COACH_CLASS_LIST_PAGE,
    path: '/classes',
  },
  {
    name: PageNames.PLAN_PAGE,
    path: '/:classId/plan',
    redirect: '/:classId/plan/lessons',
  },
  {
    name: PageNames.REPORTS_PAGE,
    path: '/:classId/reports',
  },
];
