import { createTranslator } from 'kolibri/utils/i18n';

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

export default {
  methods: {
    getTaskString,
  },
};
