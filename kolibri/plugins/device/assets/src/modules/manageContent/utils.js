import coreStore from 'kolibri/store';
import { TaskStatuses } from 'kolibri-common/utils/syncTaskUtils';

/**
 * Watches the state.taskList and resolves when the tracked Task is COMPLETED.
 *
 * @param {string} taskId
 * @returns {Promise}
 *
 */
export function waitForTaskToComplete(taskId, store = coreStore) {
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
