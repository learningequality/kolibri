import { ContentNodeProgressResource } from 'kolibri.resources';
import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
import { assessmentMetaDataState } from 'kolibri.coreVue.vuex.mappers';
import { getContentNodeThumbnail } from 'kolibri.utils.contentNode';
import tail from 'lodash/tail';

// adds progress, thumbnail, and breadcrumbs. normalizes pk/id and kind
export function normalizeContentNode(node, ancestors = []) {
  return {
    ...node,
    kind: node.parent ? node.kind : ContentNodeKinds.CHANNEL,
    thumbnail: getContentNodeThumbnail(node) || undefined,
    breadcrumbs: tail(ancestors),
    progress: Math.min(node.progress_fraction || 0, 1.0),
    copies_count: node.copies_count,
  };
}

export function contentState(node, next_content = [], ancestors = []) {
  if (!node) return null;
  return {
    next_content,
    ...normalizeContentNode(node, ancestors),
    ...assessmentMetaDataState(node),
  };
}

export function _collectionState(data) {
  return data.map(item =>
    item.kind === ContentNodeKinds.TOPICS ? normalizeContentNode(item) : contentState(item)
  );
}

/**
 * Cache utility functions
 *
 * These methods are used to manipulate client side cache to reduce requests
 */

export function updateContentNodeProgress(channelId, contentId, progressFraction) {
  /*
   * Update the progress_fraction directly on the model object, so as to prevent having
   * to cache bust the model (and hence the entire collection), because some progress was
   * made on this ContentNode.
   */
  ContentNodeProgressResource.getModel(contentId).set({ progress_fraction: progressFraction });
}
