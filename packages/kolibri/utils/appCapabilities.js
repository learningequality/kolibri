import client from 'kolibri/client';
import logger from 'kolibri-logging';
import urls from 'kolibri/urls';
import useUser from 'kolibri/composables/useUser';
import { get } from '@vueuse/core';
import plugin_data from 'kolibri-plugin-data';

const logging = logger.getLogger(__filename);

const appCapabilities = plugin_data.appCapabilities || {};

// Check that we are in an appcontext, if not disable all capabilities
// this means that consumers of this API can rely solely on the existence
// check of methods in this API to know if they can call these or not.
export const checkCapability = key => {
  const { isAppContext } = useUser();
  return get(isAppContext) && appCapabilities[key];
};

// Use a janky getter to return a method here to only expose functions
// that are available so that we have a single API for both existence
// checks and exposing the functions.

export default {
  /**
   * @returns fn -> Promise<{ value: (boolean | null) }>
   * Returns a function that returns a Promise that resolves to something responding to
   * `data.value` whether it succeeds or fails.
   */
  checkIsMetered() {
    if (!checkCapability('check_is_metered')) {
      return Promise.resolve(null);
    }

    const urlFunction = urls['kolibri:kolibri.plugins.app:appcommands_check_is_metered'];
    if (!urlFunction || !checkCapability('check_is_metered')) {
      logging.warn('Checking if the device is metered is not supported on this platform');
      return Promise.resolve(null);
    }
    return client({ url: urlFunction(), method: 'GET' }).then(response => response.data.value);
  },
  get shareFile() {
    if (!checkCapability('share_file')) {
      return; // eslint-disable-line getter-return
    }
    // Deliberately using an options object here for the function signature,
    // rather than positional arguments, so that we can evolve the API but
    // maintain backwards compatibility.
    // It would be more elegant to use a proxy for this, but that would require
    // adding a polyfill for this specific usage, so this works just as well.
    return ({ filename, message }) => {
      const urlFunction = urls['kolibri:kolibri.plugins.app:appcommands_share_file'];
      if (!urlFunction) {
        logging.warn('Sharing a file is not supported on this platform');
        return Promise.reject();
      }
      return client({
        url: urlFunction(),
        method: 'POST',
        data: { filename, message },
      });
    };
  },
};
