import find from 'lodash/find';
import { TaskResource, ChannelResource } from 'kolibri.resources';
import { NetworkLocationResource } from '../../apiResources';

// Tries to find an existing CHANNELDIFFSTATS task, or create a new one.
const kolibriStudioUrl = 'https://studio.learningequality.org';

// Based on URL parameters from NewChannelVersionPage, fetches the channel
// to be updated. Returns errors if params are invalid.
export function fetchCurrentChannel(params) {
  const { channelId, driveId, addressId } = params;
  return ChannelResource.fetchModel({ id: channelId })
    .then(() => {
      if (driveId) {
        // Check if drive is attached
        return TaskResource.localDrives().then(drives => {
          const driveMatch = find(drives, { id: driveId });
          if (!driveMatch) {
            // Re-use same error if drive not found
            return Promise.reject('CHANNEL_NOT_ON_DRIVE');
          }

          const channelMatch = find(driveMatch.metadata.channels, { id: channelId });

          if (!channelMatch) {
            return Promise.reject('CHANNEL_NOT_ON_DRIVE');
          }

          return {
            ...channelMatch,
          };
        });
      } else if (addressId) {
        // Check if the Address ID has a model
        return NetworkLocationResource.fetchModel({ id: addressId })
          .then(networkLocation => {
            console.log(networkLocation);
          })
          .catch(() => {
            // Re-use error if location not found
            return Promise.reject('CHANNEL_NOT_ON_PEER');
          });
      } else {
        //
      }
    })
    .catch(error => {
      if (error.status.code === 404) {
        return Promise.reject('CHANNEL_NOT_INSTALLED');
      }
    });
}

export function fetchOrTriggerChannelDiffStatsTask(params) {
  const { channelId, driveId, baseurl } = params;
  // Re-use the same object for lodash/find and making POST request.
  // Separate 'method' since it isn't part of Task metadata.
  let method;
  let taskAttrs = {
    channel_id: channelId,
  };
  if (driveId) {
    method = 'disk';
    taskAttrs.drive_id = driveId;
  } else if (baseurl) {
    method = 'network';
    taskAttrs.baseurl = baseurl;
  } else {
    method = 'network';
    taskAttrs.baseurl = kolibriStudioUrl;
  }
  return TaskResource.fetchCollection({ force: true }).then(tasks => {
    const match = find(tasks, taskAttrs);
    if (match) {
      return match;
    } else {
      return TaskResource.postListEndpoint('channeldiffstats', { ...taskAttrs, method });
    }
  });
}
