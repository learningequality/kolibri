import {
  ContentNodeGranularResource,
  ContentNodeSlimResource,
  RemoteChannelResource,
  TaskResource,
} from 'kolibri.resources';
import { getChannelWithContentSizes } from '../../../modules/wizard/apiChannelMetadata';
import { getDeviceInfo } from '../../../modules/deviceInfo/handlers';

export function fetchPageData(channelId) {
  const studioChannelPromise = RemoteChannelResource.fetchModel({ id: channelId, force: true })
    .then(channel => {
      this.studioChannel = { ...channel[0] };
    })
    .catch(() => {
      // Fail silently in case server is offline
      return null;
    });
  return Promise.all([
    getDeviceInfo(),
    getChannelWithContentSizes(this.channelId),
    studioChannelPromise,
  ]).then(([deviceInfo, channel, studioChannel]) => {
    return {
      freeSpace: deviceInfo.free_space,
      channel,
      studioChannel,
    };
  });
}

export function fetchNodeWithAncestors(nodeId) {
  return Promise.all([
    ContentNodeGranularResource.fetchModel({
      id: nodeId,
      getParams: {
        // Set this param to only show resources that are 'available'
        for_export: true,
      },
      force: true,
    }),
    ContentNodeSlimResource.fetchAncestors(nodeId),
  ]).then(([node, ancestors]) => {
    return { ...node, ancestors: [...ancestors] };
  });
}

export function startExportTask(params) {
  const { channelId, driveId, included, omitted } = params;
  return TaskResource.startDiskContentExport({
    channel_id: channelId,
    drive_id: driveId,
    node_ids: included,
    exclude_node_ids: omitted,
  });
}

export function startDeleteTask(params) {
  const { channelId, included, excluded, deleteEverywhere } = params;
  // NOTE: startdeletechannel with node_ids/exclude_node_ids only
  // deletes sub-trees of channel
  return TaskResource.postListEndpoint('startdeletechannel', {
    channel_id: channelId,
    node_ids: included,
    exclude_node_ids: excluded,
    force_delete: deleteEverywhere,
  });
}
