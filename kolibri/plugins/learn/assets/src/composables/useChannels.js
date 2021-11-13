/**
 * A composable function containing logic related to channels
 */

import { ref } from 'kolibri.lib.vueCompositionApi';
import plugin_data from 'plugin_data';

const channelsArray = plugin_data.channels ? plugin_data.channels : [];
const chanMap = {};

for (let channel of channelsArray) {
  chanMap[channel.id] = channel;
}

// The refs are defined in the outer scope so they can be used as a shared store
const channels = ref(channelsArray);
const channelsMap = ref(chanMap);

export default function useChannels() {
  return {
    channels,
    channelsMap,
  };
}
