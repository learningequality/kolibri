/**
 * A composable function containing logic related to channels
 */
import pickBy from 'lodash/pickBy';
import { ref, reactive } from 'vue';
import ChannelResource from 'kolibri-common/apiResources/ChannelResource';
import { get, set } from '@vueuse/core';

// The refs are defined in the outer scope so they can be used as a shared store
const channelsMap = reactive({});

const localChannelsCache = ref([]);

function fetchChannels(params) {
  params = pickBy(params || {});
  return ChannelResource.list({ available: true, ...params }).then(channels => {
    for (const channel of channels) {
      set(channelsMap, channel.id, channel);
    }
    if (Object.keys(params).length === 0) {
      set(localChannelsCache, channels);
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
    channelsMap,
    localChannelsCache,
    fetchChannels,
    getChannelThumbnail,
    getChannelTitle,
  };
}
