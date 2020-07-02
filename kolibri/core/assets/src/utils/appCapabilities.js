import client from 'kolibri.client';
import store from 'kolibri.coreVue.vuex.store';
import logger from 'kolibri.lib.logging';
import urls from 'kolibri.urls';
import plugin_data from 'plugin_data';

const logging = logger.getLogger(__filename);

const appCapabilities = plugin_data.appCapabilities || {};

// Check that we are in an appcontext, if not disable all capabilities
// this means that consumers of this API can rely solely on the existence
// check of methods in this API to know if they can call these or not.
const checkCapability = key => store.getters.isAppContext && appCapabilities[key];

// Use a janky getter to return a method here to only expose functions
// that are available so that we have a single API for both existence
// checks and exposing the functions.

export default {
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
      const urlFunction = urls['kolibri:kolibri.plugins.app:appcommands-share-file'];
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
