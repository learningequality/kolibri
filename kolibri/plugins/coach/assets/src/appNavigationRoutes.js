import routes from './routes/reportRoutes';
import planRoutes from './routes/planRoutes';

// let pathMap = {};

// const createPathMap = () => {
//     Object.keys(routes).forEach(key => {
//         let pathName = routes[key].name;
//         let pathRoute = routes[key].path;
//         if (pathName) {
//             pathMap[`${pathName}`] = pathRoute;
//         }
//     });
// };

// createPathMap();

export function generateSideNavReportRoute(id, classId) {
  let route = routes.find(item => item.name === id);
  let query = {};
  if (classId) {
    query.class_id = classId;
  }
  return {
    ...route,
    query,
  };
}

export function generateSideNavPlanRoute(id, classId) {
  let route = planRoutes.find(item => item.name === id);
  let query = {};
  if (classId) {
    query.class_id = classId;
  }
  return {
    ...route,
    query,
  };
}
