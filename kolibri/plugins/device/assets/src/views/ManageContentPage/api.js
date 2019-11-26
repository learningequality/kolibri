import find from 'lodash/find';
import { TaskResource } from 'kolibri.resources';

// Tries to find an existing CHANNELDIFFSTATS task, or create a new one.
const kolibriStudioUrl = 'https://studio.learningequality.org';

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
