import logger from 'kolibri.lib.logging';
import { TaskResource } from 'kolibri.resources';
// import client from 'kolibri.client';
// import urls from 'kolibri.urls';
import { TaskStatuses, TaskTypes } from '../../constants';

const logging = logger.getLogger(__filename);

function checkTaskStatus(store, newTasks, taskType, taskId, commitStart, commitFinish) {
  // if task job has already been fetched, just continually check if its completed
  if (taskId) {
    const task = newTasks.find(task => task.id === taskId);

    if (task && task.status === TaskStatuses.COMPLETED) {
      store.commit(commitFinish, new Date());
      TaskResource.deleteFinishedTask(taskId);
    }
  } else {
    const running = newTasks.filter(task => {
      return (
        task.type === taskType &&
        task.status !== TaskStatuses.COMPLETED &&
        task.status !== TaskStatuses.FAILED
      );
    });
    if (running.length > 0) store.commit(commitStart, running[0]);
  }
}

function refreshTaskList(store) {
  return TaskResource.fetchCollection({
    force: true,
  })
    .then(newTasks => {
      checkTaskStatus(
        store,
        newTasks,
        TaskTypes.EXPORTSESSIONLOGCSV,
        store.getters.sessionTaskId,
        'START_SESSION_CSV_EXPORT',
        'SET_FINISHED_SESSION_CSV_CREATION'
      );
      checkTaskStatus(
        store,
        newTasks,
        TaskTypes.EXPORTSUMMARYLOGCSV,
        store.getters.summaryTaskId,
        'START_SUMMARY_CSV_EXPORT',
        'SET_FINISHED_SUMMARY_CSV_CREATION'
      );
      checkTaskStatus(
        store,
        newTasks,
        TaskTypes.SYNCDATAPORTAL,
        store.state.facilityTaskId,
        'START_FACILITY_SYNC',
        'SET_FINISH_FACILITY_SYNC'
      );
    })
    .catch(error => {
      logging.error('There was an error while fetching the task list: ', error);
    });
}

export default {
  refreshTaskList,
};
