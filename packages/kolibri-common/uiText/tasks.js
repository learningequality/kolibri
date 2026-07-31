import { createTranslator } from 'kolibri/utils/i18n';
import { now } from 'kolibri/utils/serverClock';

const taskStrings = createTranslator('TaskStrings', {
  // Generic Task strings
  taskWaitingStatus: {
    message: 'Waiting',
    context: 'Generic task status',
  },
  taskCanceledStatus: {
    message: 'Canceled',
    context: 'Generic task status',
  },
  taskCancelingStatus: {
    message: 'Canceling',
    context: 'Generic task status',
  },
  taskFinishedStatus: {
    message: 'Finished',
    context: 'Generic task status indicating that a task has been completed.',
  },
  taskFailedStatus: {
    message: 'Failed',
    context: 'Generic task status',
  },
  taskFinishedRelativeStatus: {
    message: 'Finished {relativeTime}',
    context:
      'Status of a task run that has completed, with a relative time such as "2 minutes ago".',
  },
  taskFailedRelativeStatus: {
    message: 'Failed {relativeTime}',
    context: 'Status of a task run that has failed, with a relative time such as "5 minutes ago".',
  },
  taskCanceledRelativeStatus: {
    message: 'Canceled {relativeTime}',
    context:
      'Status of a task run that was canceled, with a relative time such as "5 minutes ago".',
  },
  taskUnknownStatus: {
    message: 'Unknown',
    context: 'A catch-all status for unknown task statuses',
  },
  taskStartedByLabel: {
    message: "Started by '{username}'",
    context: 'Displays the user that started a task',
  },
  taskLODFinishedByLabel: {
    message: "Account '{fullname}' from '{facilityname}' successfully loaded to this device",
    context: 'Displays the full name of the user that has been synced in a task',
  },
  clearCompletedTasksAction: {
    message: 'Clear completed',
    context: 'Label for buttons that clear completed tasks',
  },
  unknownUsername: {
    message: 'Unknown user',
    context: 'A placeholder username if the username is not attached to a task.',
  },

  // Sync Facility Task strings
  establishingConnectionStatus: {
    message: 'Establishing connection',
    context: 'Sync task status',
  },
  remotelyPreparingDataStatus: {
    message: 'Remotely preparing data',
    context: 'Sync task status',
  },
  receivingDataStatus: {
    message: 'Receiving data',
    context: 'Sync task status',
  },
  locallyIntegratingDataStatus: {
    message: 'Locally integrating received data',
    context: 'Sync task status',
  },
  locallyPreparingDataStatus: {
    message: 'Locally preparing data to send',
    context: 'Sync task status',
  },
  sendingDataStatus: {
    message: 'Sending data',
    context: 'Sync task status',
  },
  remotelyIntegratingDataStatus: {
    message: 'Remotely integrating data',
    context: 'Sync task status',
  },
  syncFacilityTaskLabel: {
    message: 'Sync {facilityName}',
    context: 'Description of sync-facility task',
  },
  syncStepAndDescription: {
    message: '{step, number} of {total, number}: {description}',
    context: 'Template for message of the form "Step 1 of 7: Establishing connection"',
  },
  syncBytesSentAndReceived: {
    message: '{bytesSent} sent • {bytesReceived} received',
    context: 'Amounts of data transferred in sync task',
  },
  syncNextRunLabel: {
    message: 'next sync {relativeTime}',
    context:
      'When a repeating sync will next run. Shown after the status of its last run, e.g. "Finished 2 minutes ago, next sync in 1 day".',
  },
  syncNextRetryLabel: {
    message: 'retrying {relativeTime}',
    context:
      'When a failed sync will be retried. Shown after the status of its last run, e.g. "Failed 5 minutes ago, retrying in 1 hour".',
  },

  // Remove Facility Task strings
  removingFacilityStatus: {
    message: 'Removing facility',
    context: 'Remove facility task status',
  },
  removeFacilityTaskLabel: {
    message: 'Remove {facilityName}',
    context: 'Description of a remove-facility task.',
  },
  removeFacilitySuccessStatus: {
    message: 'Facility successfully removed',
    context: 'Message that shows after Facility is successfully removed',
  },

  // Import Facility Task strings
  importFacilityTaskLabel: {
    message: 'Import {facilityName}',
    context: 'Description of import-facility task',
  },
  importSuccessStatus: {
    message: "The '{facilityName}' learning facility has been successfully loaded to this device",
    context:
      "Confirmation message displayed when a facility's data is imported successfully in the syncing process.",
  },
  importFailedStatus: {
    message: `Could not import '{facilityName}'`,
    context:
      "Error message displayed when a facility's data cannot be imported in the syncing process.",
  },
});

export function getTaskString(...args) {
  return taskStrings.$tr(...args);
}

// 'best fit' would render a day out as "tomorrow", which at 23:00 is an hour
// off — ambiguous for a schedule.
export function getRelativeTaskTime(datetime) {
  return taskStrings.$formatRelative(datetime, { style: 'numeric', now: now() });
}

export default {
  methods: {
    getTaskString,
  },
};
