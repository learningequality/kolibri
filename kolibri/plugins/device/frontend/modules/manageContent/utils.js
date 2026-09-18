import TaskResource from 'kolibri/apiResources/TaskResource';
import { TaskStatuses } from 'kolibri-common/utils/syncTaskUtils';

/**
 * Cancels a task and clears it once the cancellation lands in state.taskList.
 *
 * NOTE: cannot be dispatched as an action, since a dispatched action receives the
 * action context, which has no `.watch` method.
 * @param {object} store - The Vuex store to watch.
 * @param {string} taskId - The id of the task to cancel.
 * @returns {Promise} Resolves once the cancelled task has been cleared.
 */
export function cancelTask(store, taskId) {
  return new Promise(resolve => {
    const cancelWatch = store.watch(
      state =>
        (state.manageContent.taskList.find(task => task.id === taskId) || {}).status ===
        TaskStatuses.CANCELED,
      () => {
        cancelWatch();
        TaskResource.clear(taskId).then(resolve);
      },
    );
    TaskResource.cancel(taskId);
  });
}

/**
 * Watches the state.taskList and resolves when the tracked Task is COMPLETED.
 * @param {object} store - The Vuex store to watch.
 * @param {string} taskId - The id of the task to track.
 * @returns {Promise<{taskId: string, cancelled: boolean}>} Resolves when the task
 * completes (or is cancelled, in which case `cancelled` is true). Rejects when the
 * task transitions to a failed state.
 */
export function waitForTaskToComplete(store, taskId) {
  const taskList = state => state.manageContent.taskList;
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
