/**
 * A composable function containing logic related to channels
 */

import { ref, reactive } from 'kolibri.lib.vueCompositionApi';
import { ChannelResource } from 'kolibri.resources';
import { get, set } from '@vueuse/core';
import plugin_data from 'plugin_data';

const channelsArray = plugin_data.channels ? plugin_data.channels : [];
const chanMap = {};

for (const channel of channelsArray) {
  chanMap[channel.id] = channel;
}

// The refs are defined in the outer scope so they can be used as a shared store
const channels = ref(channelsArray);
const channelsMap = reactive(chanMap);

function fetchChannels(params) {
  return ChannelResource.list(params).then(channels => {
    for (const channel of channels) {
      set(channelsMap, channel.id, channel);
    }
    return channels;
  });
}

function getChannelThumbnail(channelId) {
  const channel = get(channelsMap)[channelId];
  if (channel) {
    return channel.thumbnail;
  }
  return '';
}

function getChannelTitle(channelId) {
  const channel = get(channelsMap)[channelId];
  if (channel) {
    return channel.name;
  }
  return '';
}

export default function useChannels() {
  return {
    channels,
    channelsMap,
    fetchChannels,
    getChannelThumbnail,
    getChannelTitle,
  };
}
