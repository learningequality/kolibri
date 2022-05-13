import logger from 'kolibri.lib.logging';
import { TaskResource } from 'kolibri.resources';
import { TaskStatuses, TaskTypes } from '../../constants';

const logging = logger.getLogger(__filename);

function startImportUsers(store, file, deleting, validate, commitStart) {
  if (store.getters.importingOrValidating) {
    return;
  }
  const params = {
    csvfile: file,
    facility_id: store.rootGetters.activeFacilityId,
    task: TaskTypes.IMPORTUSERSFROMCSV,
    delete: deleting,
    dryrun: validate,
  };
  return TaskResource.startTask(params, true).then(task => {
    store.commit(commitStart, task.data);
    return task.data.id;
  });
}

function startValidating(store, payload) {
  store.commit('SET_DELETE_USERS', payload.deleteUsers);
  return startImportUsers(store, payload.file, payload.deleteUsers, true, 'START_VALIDATE_USERS');
}
function startSavingUsers(store) {
  return startImportUsers(
    store,
    store.getters.filename,
    store.getters.deleteUsers,
    false,
    'START_SAVE_USERS'
  );
}

function checkTaskStatus(store, newTasks, taskType, taskId, commitStart, commitFinish) {
  // if task job has already been fetched, just continually check if its completed
  if (taskId) {
    const task = newTasks.find(task => task.id === taskId);

    if (task && task.status === TaskStatuses.COMPLETED) {
      store.commit(commitFinish, task);
    } else if (task && task.status === TaskStatuses.FAILED) {
      if (typeof task.overall_error === 'undefined') {
        store.dispatch('handleApiError', task.traceback, { root: true });
      }

      store.commit('SET_FAILED', task);
    }
  } else {
    const running = newTasks.filter(task => {
      return (
        task.task === taskType &&
        task.status !== TaskStatuses.COMPLETED &&
        task.status !== TaskStatuses.FAILED
      );
    });
    if (running.length > 0) store.commit(commitStart, running[0]);
  }
}

function refreshTaskList(store) {
  return TaskResource.list()
    .then(({ data }) => {
      checkTaskStatus(
        store,
        data,
        TaskTypes.IMPORTUSERSFROMCSV,
        store.getters.taskId,
        'START_VALIDATE_USERS',
        'SET_FINISHED_IMPORT_USERS'
      );
    })
    .catch(error => {
      logging.error('There was an error while fetching the task list: ', error);
    });
}

export default {
  refreshTaskList,
  startValidating,
  startSavingUsers,
};
