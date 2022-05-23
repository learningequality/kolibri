import find from 'lodash/find';
import { TaskResource, ChannelResource, RemoteChannelResource } from 'kolibri.resources';
import client from 'kolibri.client';
import urls from 'kolibri.urls';
import { TaskTypes } from '../../constants';
import { NetworkLocationResource } from '../../apiResources';

function getChannelOnDrive(driveId, channelId) {
  return client({ url: urls['kolibri:core:driveinfo-detail'](driveId) })
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

function getChannelOnPeer(addressId, channelId) {
  return NetworkLocationResource.fetchModel({ id: addressId })
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

function getChannelOnStudio(channelId) {
  return RemoteChannelResource.fetchModel({
    id: channelId,
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
  const { channelId, driveId, addressId } = params;
  let sourcePromise;
  if (driveId) {
    sourcePromise = getChannelOnDrive(driveId, channelId);
  } else if (addressId) {
    sourcePromise = getChannelOnPeer(addressId, channelId);
  } else {
    sourcePromise = getChannelOnStudio(channelId);
  }
  return Promise.all([getInstalledChannel(channelId), sourcePromise]);
}

export function fetchOrTriggerChannelDiffStatsTask(params) {
  const { channelId, driveId, baseurl } = params;
  // Re-use the same object for lodash/find and making POST request.
  // Separate 'method' since it isn't part of Task metadata.
  const method = driveId ? 'disk' : 'network';
  const taskAttrs = {
    channel_id: channelId,
    drive_id: driveId,
    baseurl,
  };

  return TaskResource.fetchCollection({ force: true }).then(tasks => {
    const match = find(tasks, { ...taskAttrs, type: TaskTypes.CHANNELDIFFSTATS });
    if (match) {
      return match;
    } else {
      return TaskResource.postListEndpoint('channeldiffstats', { ...taskAttrs, method }).then(
        taskResponse => taskResponse.data
      );
    }
  });
}
