import ContentNodeGranularResource from 'kolibri-common/apiResources/ContentNodeGranularResource';
import RemoteChannelResource from 'kolibri-common/apiResources/RemoteChannelResource';
import TaskResource from 'kolibri/apiResources/TaskResource';
import { TaskTypes } from 'kolibri-common/utils/syncTaskUtils';
import { getChannelWithContentSizes } from '../../../modules/wizard/apiChannelMetadata';
import { getDeviceInfo } from '../../../modules/deviceInfo/handlers';

export function fetchPageData(channelId) {
  const studioChannelPromise = RemoteChannelResource.fetchModel({ id: channelId, force: true })
    .then(channel => {
      this.studioChannel = channel;
    })
    .catch(() => {
      // Fail silently in case server is offline
      return null;
    });
  return Promise.all([
    getDeviceInfo(),
    getChannelWithContentSizes(channelId, false),
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
  return ContentNodeGranularResource.fetchModel({
    id: nodeId,
    getParams: {
      // Set this param to only show resources that are 'available'
      for_export: true,
    },
    force: true,
  });
}

export function startExportTask(params) {
  const { channelId, channelName, driveId, included, omitted } = params;
  return TaskResource.startTask({
    type: TaskTypes.DISKEXPORT,
    channel_id: channelId,
    channel_name: channelName,
    drive_id: driveId,
    node_ids: included,
    exclude_node_ids: omitted,
  });
}

export function startDeleteTask(params) {
  const { channelId, channelName, included, excluded, deleteEverywhere } = params;
  // NOTE: node_ids/exclude_node_ids only deletes sub-trees of channel
  return TaskResource.startTask({
    type: TaskTypes.DELETECHANNEL,
    channel_id: channelId,
    channel_name: channelName,
    node_ids: included,
    exclude_node_ids: excluded,
    force_delete: deleteEverywhere,
  });
}
