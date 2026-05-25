import find from 'lodash/find';
import TaskResource from 'kolibri/apiResources/TaskResource';
import RemoteChannelResource from 'kolibri-common/apiResources/RemoteChannelResource';
import { NetworkLocationResource } from 'kolibri-common/apiResources/NetworkLocationResource';
import client from 'kolibri/client';
import urls from 'kolibri/urls';
import { TaskTypes } from 'kolibri-common/utils/syncTaskUtils';
import ChannelResource from '../../apiResources/deviceChannel';

function getChannelOnDrive(driveId, channelId) {
  return client({ url: urls['kolibri:core:driveinfo_detail'](driveId) })
    .then(({ data }) => {
      const channelMatch = find(data.metadata.channels, { id: channelId });
      if (!channelMatch) {
        throw ReferenceError('CHANNEL_NOT_ON_DRIVE');
      }
      return {
        ...channelMatch,
        driveId,
      };
    })
    .catch(() => {
      return Promise.reject('CHANNEL_NOT_ON_DRIVE');
    });
}

function getChannelOnPeer(peerId, channelId) {
  return NetworkLocationResource.fetchModel({ id: peerId })
    .then(location => {
      return RemoteChannelResource.fetchModel({
        id: channelId,
        getParams: {
          baseurl: location.base_url,
        },
        force: true,
      }).then(channel => {
        return {
          ...channel,
          baseurl: location.base_url,
        };
      });
    })
    .catch(() => {
      return Promise.reject('CHANNEL_NOT_ON_PEER');
    });
}

function getChannelOnStudio(channelId, token) {
  return RemoteChannelResource.fetchModel({
    id: channelId,
    getParams: token ? { token } : undefined,
    force: true,
  }).catch(() => {
    return Promise.reject('CHANNEL_NOT_ON_STUDIO');
  });
}

function getInstalledChannel(channelId) {
  return ChannelResource.fetchModel({ id: channelId }).catch(() => {
    return Promise.reject('CHANNEL_NOT_INSTALLED');
  });
}

// Based on URL parameters from NewChannelVersionPage, fetches the channel
// to be installed. Returns errors if params are invalid.
export function fetchChannelAtSource(params) {
  const { channel_id, drive_id, peer, token } = params;
  if (drive_id) {
    return Promise.all([getInstalledChannel(channel_id), getChannelOnDrive(drive_id, channel_id)]);
  } else if (peer) {
    return Promise.all([getInstalledChannel(channel_id), getChannelOnPeer(peer, channel_id)]);
  } else {
    const installedPromise = getInstalledChannel(channel_id);
    const studioPromise = getChannelOnStudio(channel_id, token);
    return Promise.all([installedPromise, studioPromise]).catch(error =>
      installedPromise.then(installedChannel => {
        if (installedChannel.version === 0) {
          return [installedChannel, null];
        }
        return Promise.reject(error);
      }),
    );
  }
}

export function fetchOrTriggerChannelDiffStatsTask(taskParams, tasks) {
  // Re-use the same object for lodash/find and making POST request.
  taskParams.type = taskParams.drive_id
    ? TaskTypes.LOCALCHANNELDIFFSTATS
    : TaskTypes.REMOTECHANNELDIFFSTATS;
  const match = find(tasks, taskParams);
  if (match) {
    return Promise.resolve(match);
  }
  return TaskResource.startTask(taskParams);
}
