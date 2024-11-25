import client from 'kolibri/client';
import logger from 'kolibri-logging';
import urls from 'kolibri/urls';

const logging = logger.getLogger(__filename);

// Use a janky getter to return a method here to only expose functions
// that are available so that we have a single API for both existence
// checks and exposing the functions.

export default {
  /**
   * @returns fn -> Promise<{ value: (boolean | null) }>
   * Returns a function that returns a Promise that resolves to something responding to
   * `data.value` whether it succeeds or fails.
   */
  get shareFile() {
    // Deliberately using an options object here for the function signature,
    // rather than positional arguments, so that we can evolve the API but
    // maintain backwards compatibility.
    // It would be more elegant to use a proxy for this, but that would require
    // adding a polyfill for this specific usage, so this works just as well.
    return ({ content_node, message }) => {
      const urlFunction = urls['kolibri:core:sharefile'];
      if (!urlFunction) {
        logging.warn('Sharing a file is not supported on this platform');
        return Promise.reject();
      }
      return client({
        url: urlFunction(),
        method: 'POST',
        data: { content_node, message },
      });
    };
  },
};
