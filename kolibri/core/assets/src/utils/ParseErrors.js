import { ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';

/**
 * Takes in an api error object and checks if it has ERROR_CONSTANTS we recognize
 * If it does, it returns an object of errors which will be handled within the form/page
 * If it does not, it defaults to the error-page and returns null
 * @param {object} errorObj
 */
export default function parseErrors(store, errorObj) {
  const error = errorObj.entity;
  if (error) {
    if (error.KOLIBRI_CONSTANTS.length) {
      const recognizedErrors = [];
      error.KOLIBRI_CONSTANTS.forEach(constant => {
        if (ERROR_CONSTANTS[constant]) {
          recognizedErrors.push(constant);
        }
      });
      if (recognizedErrors.length) {
        return recognizedErrors;
      }
    }
  }
  store.dispatch('handleApiError', errorObj);
  return null;
}
