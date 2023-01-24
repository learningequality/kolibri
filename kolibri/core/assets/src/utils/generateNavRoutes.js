var pathToRegexp = require('path-to-regexp');

export function generateNavRoute(rootUrl, pathReference, baseRoutes, params) {
  let pathMap = {};
  let compiledRoute;
  Object.keys(baseRoutes).forEach(key => {
    let pathName = baseRoutes[key].name;
    let pathRoute = baseRoutes[key].path;
    if (pathName) {
      pathMap[`${pathName}`] = pathRoute;
    }
  });

  compiledRoute = `${rootUrl}#${pathMap[pathReference]}`;

  if (params) {
    const pathRegex = `${rootUrl}#${pathMap[pathReference]}`;
    const toPath = pathToRegexp.compile(pathRegex);
    toPath(params);
    compiledRoute = toPath(params);
  }

  return compiledRoute;
}
