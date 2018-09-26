import { TaskResource } from 'kolibri.resources';
import { taskList, wizardState, inLocalImportMode, inRemoteImportMode } from '../getters';
import ChannelResource from '../../apiResources/deviceChannel';
import { TaskStatuses } from '../../constants';

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
  const { transferredChannel, selectedDrive } = wizardState(store.state);
  let promise;
  if (inLocalImportMode(store.state)) {
    promise = TaskResource.startDiskChannelImport({
      channel_id: transferredChannel.id,
      drive_id: selectedDrive.id,
    });
  } else if (inRemoteImportMode(store.state)) {
    promise = TaskResource.startRemoteChannelImport({
      channel_id: transferredChannel.id,
    });
  } else {
    return Error('Channel Metadata is only downloaded when importing');
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
          return ChannelResource.getModel(transferredChannel.id).fetch({
            include_fields: [
              'total_resources',
              'total_file_size',
              'on_device_resources',
              'on_device_file_size',
            ],
          })._promise;
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
  const combineIds = nodes => nodes.map(({ id }) => id);
  const { transferredChannel, selectedDrive, nodesForTransfer } = wizardState(store.state);
  const params = {
    channel_id: transferredChannel.id,
    node_ids: combineIds(nodesForTransfer.included),
    exclude_node_ids: combineIds(nodesForTransfer.omitted),
  };

  if (inRemoteImportMode(store.state)) {
    promise = TaskResource.startRemoteContentImport(params);
  } else if (inLocalImportMode(store.state)) {
    promise = TaskResource.startDiskContentImport({
      ...params,
      drive_id: selectedDrive.id,
    });
  } else {
    promise = TaskResource.startDiskContentExport({
      ...params,
      drive_id: selectedDrive.id,
    });
  }
  return promise;
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
