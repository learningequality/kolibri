import { coreStrings } from 'kolibri.coreVue.mixins.commonCoreStrings';
import bytesForHumans from 'kolibri.utils.bytesForHumans';
import { taskIsClearable, TaskStatuses } from '../constants';
import taskStrings from './taskStrings';

const SyncTaskStatuses = {
  SESSION_CREATION: 'SESSION_CREATION',
  REMOTE_QUEUING: 'REMOTE_QUEUING',
  PULLING: 'PULLING',
  LOCAL_DEQUEUING: 'LOCAL_DEQUEUING',
  LOCAL_QUEUING: 'LOCAL_QUEUING',
  PUSHING: 'PUSHING',
  REMOTE_DEQUEUING: 'REMOTE_DEQUEUING',
  REMOVING_FACILITY: 'REMOVING_FACILITY',
};

const syncTaskStatusToStepMap = {
  [SyncTaskStatuses.SESSION_CREATION]: 1,
  [SyncTaskStatuses.REMOTE_QUEUING]: 2,
  [SyncTaskStatuses.PULLING]: 3,
  [SyncTaskStatuses.LOCAL_DEQUEUING]: 4,
  [SyncTaskStatuses.LOCAL_QUEUING]: 5,
  [SyncTaskStatuses.PUSHING]: 6,
  [SyncTaskStatuses.REMOTE_DEQUEUING]: 7,
};

const genericStatusToDescriptionMap = {
  [TaskStatuses.PENDING]: taskStrings.$tr('taskWaitingStatus'),
  [TaskStatuses.COMPLETED]: taskStrings.$tr('taskFinishedStatus'),
  [TaskStatuses.CANCELED]: taskStrings.$tr('taskCanceledStatus'),
  [TaskStatuses.CANCELING]: taskStrings.$tr('taskCancelingStatus'),
  [TaskStatuses.FAILED]: taskStrings.$tr('taskFailedStatus'),
};

export const syncStatusToDescriptionMap = {
  ...genericStatusToDescriptionMap,
  [SyncTaskStatuses.SESSION_CREATION]: taskStrings.$tr('establishingConnectionStatus'),
  [SyncTaskStatuses.REMOTE_QUEUING]: taskStrings.$tr('remotelyPreparingDataStatus'),
  [SyncTaskStatuses.PULLING]: taskStrings.$tr('receivingDataStatus'),
  [SyncTaskStatuses.LOCAL_DEQUEUING]: taskStrings.$tr('locallyIntegratingDataStatus'),
  [SyncTaskStatuses.LOCAL_QUEUING]: taskStrings.$tr('locallyPreparingDataStatus'),
  [SyncTaskStatuses.PUSHING]: taskStrings.$tr('sendingDataStatus'),
  [SyncTaskStatuses.REMOTE_DEQUEUING]: taskStrings.$tr('remotelyIntegratingDataStatus'),
};

function formatNameWithId(name, id) {
  return coreStrings.$tr('nameWithIdInParens', { name, id: id.slice(0, 4) });
}

export function syncFacilityTaskDisplayInfo(task) {
  let statusMsg;
  let bytesTransferredMsg = '';

  const facilityName = formatNameWithId(task.facility_name, task.facility_id);
  const deviceNameMsg = formatNameWithId(task.device_name, task.device_id);
  const syncStep = syncTaskStatusToStepMap[task.status];
  const statusDescription =
    syncStatusToDescriptionMap[task.status] || taskStrings.$tr('taskUnknownStatus');

  if (syncStep) {
    statusMsg = taskStrings.$tr('syncStepAndDescription', {
      step: syncStep,
      total: 7,
      description: statusDescription,
    });
  } else {
    statusMsg = statusDescription;
  }

  if (task.status === TaskStatuses.COMPLETED) {
    bytesTransferredMsg = taskStrings.$tr('syncBytesSentAndReceived', {
      bytesReceived: bytesForHumans(task.bytes_received),
      bytesSent: bytesForHumans(task.bytes_sent),
    });
  }

  const canClear = taskIsClearable(task);

  return {
    headingMsg: taskStrings.$tr('syncFacilityTaskLabel', { facilityName }),
    statusMsg,
    startedByMsg: taskStrings.$tr('taskStartedByLabel', { username: task.started_by_username }),
    bytesTransferredMsg,
    deviceNameMsg,
    isRunning: Boolean(syncStep),
    canClear,
    canCancel: !canClear,
    canRetry: task.status === TaskStatuses.FAILED,
    taskData: task,
  };
}

export const removeStatusToDescriptionMap = {
  ...genericStatusToDescriptionMap,
  REMOVING_FACILITY: taskStrings.$tr('removingFacilityStatus'),
};

export function removeFacilityTaskDisplayInfo(task) {
  const facilityName = formatNameWithId(task.facility_name, task.facility_id);
  const statusDescription =
    removeStatusToDescriptionMap[task.status] || taskStrings.$tr('taskUnknownStatus');

  return {
    headingMsg: taskStrings.$tr('removeFacilityTaskLabel', { facilityName }),
    statusMsg: statusDescription,
    startedByMsg: taskStrings.$tr('taskStartedByLabel', { username: task.started_by_username }),
    canClear: taskIsClearable(task),
    canCancel: !taskIsClearable(task) && task.status !== 'REMOVING_FACILITY',
    canRetry: task.status === TaskStatuses.FAILED,
    taskData: task,
  };
}
