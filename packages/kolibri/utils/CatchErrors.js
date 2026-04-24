export default function CatchErrors(errorObj, errorConstants) {
  const errors = errorObj.response.data;
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
