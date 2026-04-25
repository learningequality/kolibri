import { ref } from 'vue';
import { set } from '@vueuse/core';
import heartbeat from 'kolibri/heartbeat';
import logger from 'kolibri-logging';
import { DisconnectionErrorCodes } from 'kolibri/constants';
import sanitizeError from 'kolibri/utils/sanitizeError';

const logging = logger.getLogger(__filename);

export const error = ref(null);

/**
 * Set a plain error string as the global app error.
 * @param {string} errorString - The error message to display
 */
export function handleError(errorString) {
  logging.debug(errorString);
  set(error, errorString);
}

/**
 * Clear the global app error state.
 */
export function clearError() {
  set(error, null);
}

/**
 * Handle an API error by setting the global error state.
 * For disconnection errors, delegates to the heartbeat reconnection overlay instead.
 * @param {object} options - Options object.
 * @param {Error|object|string} options.error - The error object or string.
 * @param {boolean} [options.reloadOnReconnect=false] - Whether to reload on reconnection.
 * @param {boolean} [options.shouldThrow=true] - Whether to re-throw the error after handling.
 * Defaults to true to preserve the original throw-after-set semantics.
 * @throws {Error|object|string} Re-throws options.error unless shouldThrow is false or the
 * error is a disconnection.
 */
export function handleApiError({ error: err, reloadOnReconnect = false, shouldThrow = true } = {}) {
  let errorString = err;
  if (typeof err === 'object' && !(err instanceof Error)) {
    errorString = JSON.stringify(sanitizeError(err), null, 2);
  } else if (err.response) {
    if (DisconnectionErrorCodes.includes(err.response.status)) {
      // Do not log errors for disconnections, as it disrupts the user experience
      // and should already be being handled by our disconnection overlay.
      heartbeat.setReloadOnReconnect(reloadOnReconnect);
      return;
    }
    // Reassign object properties here as Axios error objects have built in
    // pretty printing support which messes with this.
    errorString = JSON.stringify(sanitizeError(err).response, null, 2);
  } else if (err instanceof Error) {
    errorString = err.toString();
  }
  handleError(errorString);
  if (shouldThrow) {
    throw err;
  }
}
