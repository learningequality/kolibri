import { createTranslator } from 'kolibri.utils.i18n';

export default createTranslator('TaskStrings', {
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
    context: 'Generic task status',
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
    message: `Started by: '{username}'`,
    context: 'Displays the user that started a task',
  },
  clearCompletedTasksAction: {
    message: 'Clear completed',
    context: 'Label for buttons that clear completed tasks',
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
    message: `Sync '{facilityName}'`,
    context: 'Description of sync-facility task',
  },

  // Remove Facility Task strings
  removingFacilityStatus: {
    message: 'Removing facility',
    context: 'Remove facility task status',
  },
  removeFacilityTaskLabel: {
    message: `Remove '{facilityName}'`,
    context: 'Description of a remove-facility task',
  },
});
