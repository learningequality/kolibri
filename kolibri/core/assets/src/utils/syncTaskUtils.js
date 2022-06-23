import commonCoreStrings from '../mixins/commonCoreStrings';
import taskStrings from '../mixins/taskStrings';
import bytesForHumans from '../utils/bytesForHumans';

export const TaskTypes = {
  REMOTECHANNELIMPORT: 'kolibri.core.content.tasks.remotechannelimport',
  REMOTECONTENTIMPORT: 'kolibri.core.content.tasks.remotecontentimport',
  REMOTEIMPORT: 'kolibri.core.content.tasks.remoteimport',
  DISKCHANNELIMPORT: 'kolibri.core.content.tasks.diskchannelimport',
  DISKCONTENTIMPORT: 'kolibri.core.content.tasks.diskcontentimport',
  DISKIMPORT: 'kolibri.core.content.tasks.diskimport',
  DISKCONTENTEXPORT: 'kolibri.core.content.tasks.diskcontentexport',
  DISKEXPORT: 'kolibri.core.content.tasks.diskexport',
  DELETECHANNEL: 'kolibri.core.content.tasks.deletechannel',
  UPDATECHANNEL: 'kolibri.core.content.tasks.updatechannel',
  REMOTECHANNELDIFFSTATS: 'kolibri.core.content.tasks.remotechanneldiffstats',
  LOCALCHANNELDIFFSTATS: 'kolibri.core.content.tasks.localchanneldiffstats',
  SYNCDATAPORTAL: 'kolibri.core.auth.tasks.dataportalsync',
  SYNCPEERFULL: 'kolibri.core.auth.tasks.peerfacilitysync',
  SYNCPEERPULL: 'kolibri.core.auth.tasks.peerfacilityimport',
  DELETEFACILITY: 'kolibri.core.auth.tasks.deletefacility',
};

// identical to facility constants.js
export const TaskStatuses = Object.freeze({
  IN_PROGRESS: 'INPROGRESS',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  QUEUED: 'QUEUED',
  SCHEDULED: 'SCHEDULED',
  CANCELED: 'CANCELED',
  CANCELING: 'CANCELING',
});

export const TransferTypes = {
  LOCALEXPORT: 'localexport',
  LOCALIMPORT: 'localimport',
  PEERIMPORT: 'peerimport',
  REMOTEIMPORT: 'remoteimport',
};

export const SyncTaskStatuses = {
  SESSION_CREATION: 'SESSION_CREATION',
  REMOTE_QUEUING: 'REMOTE_QUEUING',
  PULLING: 'PULLING',
  LOCAL_DEQUEUING: 'LOCAL_DEQUEUING',
  LOCAL_QUEUING: 'LOCAL_QUEUING',
  PUSHING: 'PUSHING',
  REMOTE_DEQUEUING: 'REMOTE_DEQUEUING',
  REMOVING_FACILITY: 'REMOVING_FACILITY',
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  FAILED: 'FAILED',
};

const { getTaskString } = taskStrings.methods;
const { coreString } = commonCoreStrings.methods;

const syncTaskStatusToStepMap = {
  [SyncTaskStatuses.SESSION_CREATION]: 1,
  [SyncTaskStatuses.REMOTE_QUEUING]: 2,
  [SyncTaskStatuses.PULLING]: 3,
  [SyncTaskStatuses.LOCAL_DEQUEUING]: 4,
  [SyncTaskStatuses.LOCAL_QUEUING]: 5,
  [SyncTaskStatuses.PUSHING]: 6,
  [SyncTaskStatuses.REMOTE_DEQUEUING]: 7,
};

// These functions are partially applied with bind() so that they are not evaluated before i18n
// is ready. If you key into this map you'll need to call the value as a fn with no args a la
// syncStatusToDescriptionMap[SyncTaskStatuses.SESSION_CREATION]();
// Note that when getTaskString or coreString is called within a function, this is unnecessary.
const genericStatusToDescriptionMap = {
  [TaskStatuses.PENDING]: getTaskString.bind(null, 'taskWaitingStatus'),
  [TaskStatuses.QUEUED]: getTaskString.bind(null, 'taskWaitingStatus'),
  [TaskStatuses.COMPLETED]: getTaskString.bind(null, 'taskFinishedStatus'),
  [TaskStatuses.CANCELED]: getTaskString.bind(null, 'taskCanceledStatus'),
  [TaskStatuses.CANCELING]: getTaskString.bind(null, 'taskCancelingStatus'),
  [TaskStatuses.FAILED]: getTaskString.bind(null, 'taskFailedStatus'),
};

export const syncStatusToDescriptionMap = {
  ...genericStatusToDescriptionMap,
  [SyncTaskStatuses.SESSION_CREATION]: getTaskString.bind(null, 'establishingConnectionStatus'),
  [SyncTaskStatuses.REMOTE_QUEUING]: getTaskString.bind(null, 'remotelyPreparingDataStatus'),
  [SyncTaskStatuses.PULLING]: getTaskString.bind(null, 'receivingDataStatus'),
  [SyncTaskStatuses.LOCAL_DEQUEUING]: getTaskString.bind(null, 'locallyIntegratingDataStatus'),
  [SyncTaskStatuses.LOCAL_QUEUING]: getTaskString.bind(null, 'locallyPreparingDataStatus'),
  [SyncTaskStatuses.PUSHING]: getTaskString.bind(null, 'sendingDataStatus'),
  [SyncTaskStatuses.REMOTE_DEQUEUING]: getTaskString.bind(null, 'remotelyIntegratingDataStatus'),
};

function formatNameWithId(name, id) {
  return coreString('nameWithIdInParens', { name, id: id.slice(0, 4) });
}

const PUSHPULLSTEPS = 7;
const PULLSTEPS = 4;

// Consolidates logic on how Sync-Facility Tasks should be displayed
export function syncFacilityTaskDisplayInfo(task) {
  let statusMsg;
  let bytesTransferredMsg = '';
  let deviceNameMsg = '';
  let headingMsg = '';

  const facilityName = formatNameWithId(task.extra_metadata.facility_name, task.facility_id);

  if (task.type === TaskTypes.SYNCPEERPULL) {
    headingMsg = getTaskString('importFacilityTaskLabel', { facilityName });
  } else {
    headingMsg = getTaskString('syncFacilityTaskLabel', { facilityName });
  }
  // Device info isn't shown on the Setup Wizard version of panel
  if (task.type === TaskTypes.SYNCDATAPORTAL) {
    deviceNameMsg = 'Kolibri Data Portal';
  } else if (task.extra_metadata.device_name) {
    deviceNameMsg = formatNameWithId(
      task.extra_metadata.device_name,
      task.extra_metadata.device_id
    );
  }
  const syncStep = syncTaskStatusToStepMap[task.extra_metadata.sync_state];
  const statusDescription =
    syncStatusToDescriptionMap[task.extra_metadata.sync_state] ||
    syncStatusToDescriptionMap[task.status] ||
    // bind this to give type parity with what the map would return (a bound fn)
    getTaskString.bind(null, 'taskUnknownStatus');

  if (task.status === TaskStatuses.COMPLETED) {
    statusMsg = getTaskString('taskFinishedStatus');
  } else if (syncStep) {
    statusMsg = getTaskString('syncStepAndDescription', {
      step: syncStep,
      total: task.type === TaskTypes.SYNCPEERPULL ? PULLSTEPS : PUSHPULLSTEPS,
      description: statusDescription(),
    });
  } else {
    if (task.type === TaskTypes.SYNCLOD && task.status === TaskStatuses.FAILED)
      statusMsg = `${statusDescription()}: ${task.exception}`;
    else statusMsg = statusDescription();
  }

  if (task.status === TaskStatuses.COMPLETED) {
    bytesTransferredMsg = getTaskString('syncBytesSentAndReceived', {
      bytesReceived: bytesForHumans(task.extra_metadata.bytes_received),
      bytesSent: bytesForHumans(task.extra_metadata.bytes_sent),
    });
  }

  const canClear = task.clearable;

  return {
    headingMsg,
    statusMsg,
    startedByMsg: getTaskString('taskStartedByLabel', {
      username: task.extra_metadata.started_by_username,
    }),
    bytesTransferredMsg,
    deviceNameMsg,
    isRunning: Boolean(syncStep) && !canClear,
    canClear,
    canCancel: !canClear && task.cancellable,
    canRetry: task.status === TaskStatuses.FAILED,
  };
}

export const removeStatusToDescriptionMap = {
  ...genericStatusToDescriptionMap,
  [TaskStatuses.RUNNING]: getTaskString.bind(null, 'removingFacilityStatus'),
};

// Consolidates logic on how Remove-Facility Tasks should be displayed
export function removeFacilityTaskDisplayInfo(task) {
  const facilityName = formatNameWithId(
    task.extra_metadata.facility_name,
    task.extra_metadata.facility
  );
  const statusDescription =
    removeStatusToDescriptionMap[task.status]() || getTaskString('taskUnknownStatus');

  return {
    headingMsg: getTaskString('removeFacilityTaskLabel', { facilityName }),
    statusMsg: statusDescription,
    startedByMsg: getTaskString('taskStartedByLabel', {
      username: task.extra_metadata.started_by_username,
    }),
    isRunning: task.status === TaskStatuses.RUNNING,
    canClear: task.clearable,
    canCancel: !task.clearable && task.status !== TaskStatuses.RUNNING,
    canRetry: task.status === TaskStatuses.FAILED,
  };
}

// For the SetupWizard Import Task
export function importFacilityTaskDisplayInfo(task) {
  // Basically takes the sync output and removes things
  const info = syncFacilityTaskDisplayInfo(task);
  info.bytesTransferredMsg = '';
  info.headingMsg = '';

  if (task.status === TaskStatuses.FAILED) {
    info.deviceNameMsg = getTaskString('importFailedStatus', {
      facilityName: task.extra_metadata.facility_name,
    });
    info.statusMsg = getTaskString('taskFailedStatus');
    info.isRunning = false;
  } else if (task.status === TaskStatuses.COMPLETED) {
    info.deviceNameMsg = getTaskString('importSuccessStatus', {
      facilityName: task.extra_metadata.facility_name,
    });
    info.statusMsg = getTaskString('taskFinishedStatus');
    info.isRunning = false;
  } else {
    info.deviceNameMsg = '';
  }
  info.canRetry = false;
  info.canClear = false;
  return info;
}
