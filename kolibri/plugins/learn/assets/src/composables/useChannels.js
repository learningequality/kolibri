/**
 * A composable function containing logic related to channels
 */

import { ref } from 'kolibri.lib.vueCompositionApi';
import { set } from '@vueuse/core';
import { ChannelResource } from 'kolibri.resources';

// The refs are defined in the outer scope so they can be use as a store
const channels = ref([]);

export default function useChannels() {
  /**
   * Fetches channels and saves data to this composable's store
   *
   * @param {Boolean} available only get the channels that are "available"
   *                            (i.e. with resources on device) when `true`
   * @returns {Promise}
   * @public
   */
  function fetchChannels({ available = true } = {}) {
    return ChannelResource.fetchCollection({ getParams: { available } }).then(collection => {
      set(channels, collection);
      return collection;
    });
  }

  return {
    channels,
    fetchChannels,
  };
}
