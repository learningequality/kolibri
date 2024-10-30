import { PageNames } from '../constants';
import { LessonsPageNames } from '../constants/lessonsConstants';
import routes from '.';

const baseRouteNames = {
  classHome: PageNames.HOME_PAGE,
  lessons: LessonsPageNames.LESSONS_ROOT,
  quizzes: PageNames.EXAMS,
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
