var pathToRegexp = require('path-to-regexp');

export function generateNavRoute(rootUrl, pathReference, baseRoutes, params) {
  const pathMap = {};
  let compiledRoute;
  baseRoutes.forEach(route => {
    if (route == pathReference) console.log('matches', pathReference);
    compiledRoute = `${rootUrl}#${pathReference.path}`;
  });

  if (params) {
    const pathRegex = `${rootUrl}#${pathMap[pathReference]}`;
    const toPath = pathToRegexp.compile(pathRegex);
    toPath(params);
    compiledRoute = toPath(params);
  }

  return compiledRoute;
}
