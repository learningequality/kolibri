import { taskList, wizardState } from '../getters';
import { ChannelResource, TaskResource } from 'kolibri.resources';
import { TaskStatuses, TransferTypes } from '../../constants';

export const ErrorTypes = {
  CONTENT_DB_LOADING_ERROR: 'CONTENT_DB_LOADING_ERROR',
  TREEVIEW_LOADING_ERROR: 'TREEVIEW_LOADING_ERROR',
  CHANNEL_TASK_ERROR: 'CHANNEL_TASK_ERROR',
};

/**
 * Starts Task that downloads a Channel Metadata database
 *
 */
export function downloadChannelMetadata(store) {
  const { transferType, transferChannel, selectedDrive } = wizardState(store.state);
  let promise;
  if (transferType === TransferTypes.LOCALIMPORT) {
    promise = TaskResource.startDiskChannelImport({
      channel_id: transferChannel.id,
      drive_id: selectedDrive.driveId,
    });
  } else if (transferType === TransferTypes.REMOTEIMPORT) {
    promise = TaskResource.startRemoteChannelImport({
      channel_id: transferChannel.id,
    });
  }
  promise = promise.catch(() => Promise.reject({ errorType: ErrorTypes.CONTENT_DB_LOADING_ERROR }));

  return promise
    .then(task => {
      return waitForTaskToComplete(store, task.entity.id);
    })
    .then(completedTask => {
      const { taskId, cancelled } = completedTask;
      if (taskId && !cancelled) {
        return TaskResource.cancelTask(taskId).then(() => {
          return ChannelResource.getModel(transferChannel.id).fetch()._promise;
        });
      }
      return Promise.reject({ errorType: ErrorTypes.CHANNEL_TASK_ERROR });
    });
}

/**
 * Starts a Task that transfers Channel ContentNodes to/from a drive
 *
 */
export function transferChannelContent(store) {
  let promise;
  const { transferType, transferChannel, selectedDrive, nodesForTransfer } = wizardState(
    store.state
  );
  const params = {
    channel_id: transferChannel.id,
    node_ids: nodesForTransfer.included.join(','),
    exclude_node_ids: nodesForTransfer.omitted.join(','),
  };
  switch (transferType) {
    case TransferTypes.REMOTEIMPORT:
      promise = TaskResource.startRemoteContentImport(params);
      break;
    case TransferTypes.LOCALIMPORT:
      promise = TaskResource.startDiskContentImport({
        ...params,
        drive_id: selectedDrive.driveId,
      });
      break;
    case TransferTypes.LOCALEXPORT:
      promise = TaskResource.startDiskContentExport({
        ...params,
        drive_id: selectedDrive.driveId,
      });
  }

  return promise.then(() => {
    // Redirect to /content page
  });
}

/**
 * Watches the pageState.taskList and resolves when the tracked Task is COMPLETED.
 *
 * @param {string} taskId
 *
 */
export function waitForTaskToComplete(store, taskId) {
  return new Promise((resolve, reject) => {
    const stopWatching = store.watch(taskList, function checkTaskProgress(tasks) {
      const match = tasks.find(task => task.id === taskId);
      // Assume if no matching Task was found, it was cancelled.
      if (!match || match.status === TaskStatuses.COMPLETED) {
        stopWatching();
        resolve({ taskId, cancelled: !match });
      } else if (match.status === TaskStatuses.FAILED) {
        stopWatching();
        reject();
      }
    });
  });
}
