import routes from './routes';

let pathMap = {};

const createPathMap = () => {
  Object.keys(routes).forEach(key => {
    let pathName = routes[key].name;
    let pathRoute = routes[key].path;
    if (pathName) {
      pathMap[`${pathName}`] = pathRoute;
    }
  });
};

createPathMap();

export default function generateSideNavRoute(rootUrl, pathReference) {
  return `${rootUrl}#${pathMap[pathReference]}`;
}
