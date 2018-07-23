/**
 * Checks if the error contains error constants that can be handled
 * If it does, it returns the array of recognized error constants.
 * If it does not, it defaults to the error page and returns null
 * @export
 * @param {store} store State
 * @param {object} errorObj Request error
 * @param {Object} errorConstants Error constants to search for
 * @returns {(Array|null)} An array of error constants or null.
 */
export default function CatchErrors(store, errorObj, errorConstants) {
  const error = errorObj.entity;
  if (error) {
    if (error.KOLIBRI_CONSTANTS.length) {
      const recognizedErrors = [];
      error.KOLIBRI_CONSTANTS.forEach(constant => {
        if (errorConstants[constant]) {
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
