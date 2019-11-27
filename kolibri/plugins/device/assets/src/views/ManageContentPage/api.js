import find from 'lodash/find';
import { TaskResource, ChannelResource, RemoteChannelResource } from 'kolibri.resources';
import { NetworkLocationResource } from '../../apiResources';

const kolibriStudioUrl = 'https://studio.learningequality.org';

function getChannelOnDrive(driveId, channelId) {
  const reject = () => Promise.reject('CHANNEL_NOT_ON_DRIVE');
  return TaskResource.localDrives().then(drives => {
    const driveMatch = find(drives, { id: driveId });
    if (!driveMatch) {
      return reject();
    }
    const channelMatch = find(driveMatch.metadata.channels, { id: channelId });
    if (!channelMatch) {
      return reject();
    }
    return {
      ...channelMatch,
      driveId,
    };
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
      }).then(([channel]) => {
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
  })
    .then(([channel]) => {
      return {
        ...channel,
        baseurl: kolibriStudioUrl,
      };
    })
    .catch(() => {
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
  let taskAttrs = {
    channel_id: channelId,
  };

  if (baseurl) {
    taskAttrs.baseurl = baseurl;
    taskAttrs.method = 'network';
  } else if (driveId) {
    taskAttrs.drive_id = driveId;
    taskAttrs.method = 'disk';
  }

  return TaskResource.fetchCollection({ force: true }).then(tasks => {
    const match = find(tasks, taskAttrs);
    if (match) {
      return match;
    } else {
      return TaskResource.postListEndpoint('channeldiffstats', taskAttrs).then(
        taskResponse => taskResponse.entity
      );
    }
  });
}
