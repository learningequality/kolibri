/**
 * Checks if the error contains error constants that can be handled
 * If it does, it returns the array of recognized error constants.
 * If it does not, it returns false
 * @export
 * @param {object} errorObj Request error
 * @param {Object} errorConstants Error constants to search for
 * @returns {(Array|null)} An array of error constants or null.
 */
export default function CatchErrors(errorObj, errorConstants) {
  const errors = errorObj.entity;
  if (errors && Array.isArray(errors)) {
    const recognizedErrors = [];
    errors.forEach(error => {
      if (error.id) {
        if (errorConstants.includes(error.id)) {
          recognizedErrors.push(error.id);
        }
      }
    });
    if (recognizedErrors.length > 0) {
      return recognizedErrors;
    }
  }
  return false;
}
