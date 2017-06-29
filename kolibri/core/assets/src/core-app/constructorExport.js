/*
 * This exports the API for the core Kolibri app.
 */

import apiSpec from './apiSpec';

const constructorExport = () => {
  /*
   * Function for building the object that populates the kolibri global object API.
   */
  const exportObj = {};
  Object.assign(exportObj, apiSpec);
  Object.assign(exportObj, __coreAPISpec); // eslint-disable-line no-undef
  return exportObj;
};

export { constructorExport as default };
