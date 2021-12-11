import { get } from '@vueuse/core';
import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
import { assessmentMetaDataState } from 'kolibri.coreVue.vuex.mappers';
import { getContentNodeThumbnail } from 'kolibri.utils.contentNode';
import useChannels from '../../composables/useChannels';

const { channelsMap } = useChannels();

// adds progress, thumbnail, and breadcrumbs. normalizes pk/id and kind
export function normalizeContentNode(node) {
  const channel = get(channelsMap)[node.channel_id];
  return {
    ...node,
    kind: node.parent ? node.kind : ContentNodeKinds.CHANNEL,
    thumbnail: getContentNodeThumbnail(node) || undefined,
    copies_count: node.copies_count,
    channel_title: channel ? channel.name : '',
    channel_thumbnail: channel ? channel.thumbnail : null,
  };
}

export function contentState(node, next_content = []) {
  if (!node) return null;
  return {
    next_content,
    ...normalizeContentNode(node),
    ...assessmentMetaDataState(node),
  };
}

export function _collectionState(data) {
  return data.map(item =>
    item.kind === ContentNodeKinds.TOPICS ? normalizeContentNode(item) : contentState(item)
  );
}
