import { PageNames } from '../constants';
import routes from '.';

const baseRouteNames = {
  classHome: PageNames.HOME_PAGE,
  lessons: PageNames.LESSONS_ROOT,
  quizzes: PageNames.EXAMS_ROOT,
  learners: PageNames.LEARNERS_ROOT,
  groups: PageNames.GROUPS_ROOT,
};

const baseRoutes = Object.entries(baseRouteNames).reduce((curr, baseRouteName) => {
  const [key, value] = baseRouteName;
  const route = routes.find(({ name }) => name === value);
  curr[key] = {
    name: route.name,
    path: route.path,
  };
  return curr;
}, {});

export default baseRoutes;
