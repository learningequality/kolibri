import { ChannelResource, TaskResource } from 'kolibri.resources';
import { TaskStatuses, ErrorTypes } from '../../constants';

/**
 * Starts Task that downloads a Channel Metadata database
 *
 */
export function downloadChannelMetadata(store) {
  const { transferredChannel, selectedDrive } = store.getters.wizardState;
  let promise;
  if (store.getters.inLocalImportMode) {
    promise = TaskResource.startDiskChannelImport({
      channel_id: transferredChannel.id,
      drive_id: selectedDrive.id,
    });
  } else if (store.getters.inRemoteImportMode) {
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
          return ChannelResource.getModel(transferredChannel.id, {
            include_fields: [
              'total_resources',
              'total_file_size',
              'on_device_resources',
              'on_device_file_size',
            ],
          }).fetch()._promise;
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
  const { transferredChannel, selectedDrive, nodesForTransfer } = store.getters.wizardState;
  const params = {
    channel_id: transferredChannel.id,
    node_ids: combineIds(nodesForTransfer.included),
    exclude_node_ids: combineIds(nodesForTransfer.omitted),
  };

  if (store.getters.inRemoteImportMode) {
    promise = TaskResource.startRemoteContentImport(params);
  } else if (store.getters.inLocalImportMode) {
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
  const taskList = state => state.pageState.taskList;
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
