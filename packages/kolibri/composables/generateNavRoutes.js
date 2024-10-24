var pathToRegexp = require('path-to-regexp');

export function generateNavRoute(rootUrl, pathReference, params = {}) {
  let compiledRoute;

  // when there is a direct path
  compiledRoute = `${rootUrl}#${pathReference}`;

  const pathParams = [];
  pathToRegexp(compiledRoute, pathParams);

  const countPathParams = pathParams.length;
  const paramName = !!countPathParams && pathParams[0].name;
  const paramValue = paramName && params[paramName];

  const onlyOptionalParams = countPathParams === 1 && pathParams[0].optional === true;
  const missingOptionalParams = onlyOptionalParams && !paramValue;

  // if path requires params but none exist (or they're the wrong params), send to root
  if (!!countPathParams && !paramValue && !onlyOptionalParams) {
    compiledRoute = rootUrl;
  }

  // if there are params with defined values being passed, include in route
  if (Object.keys(params).length > 0 && !!Object.values(params)[0]) {
    const makeParamsRoute = pathToRegexp.compile(compiledRoute);
    compiledRoute = makeParamsRoute(params);
  }

  // if there are only optional params & they're not provided, build route without them
  if (onlyOptionalParams && missingOptionalParams) {
    const optionalPathReference = pathReference.slice(pathReference.indexOf('?') + 1);
    compiledRoute = `${rootUrl}#${optionalPathReference}`;
  }

  return compiledRoute;
}
