export function generateNavRoute(rootUrl, pathReference, baseRoutes) {
  console.log('generating side nav route', rootUrl, pathReference, baseRoutes);
  let pathMap = {};
  Object.keys(baseRoutes).forEach(key => {
    let pathName = baseRoutes[key].name;
    let pathRoute = baseRoutes[key].path;
    if (pathName) {
      pathMap[`${pathName}`] = pathRoute;
    }
  });
  console.log('pathmap', `${rootUrl}#${pathMap[pathReference]}`);

  return `${rootUrl}#${pathMap[pathReference]}`;
}
