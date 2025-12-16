import logger from 'kolibri-logging';
import TaskResource from 'kolibri/apiResources/TaskResource';
import { currentLanguage } from 'kolibri/utils/i18n';
import { TaskStatuses, TaskTypes } from 'kolibri-common/utils/syncTaskUtils';

const logging = logger.getLogger(__filename);

function startImportUsers(store, file, filename, deleting, validate, commitStart) {
  if (store.getters.importingOrValidating) {
    return;
  }
  const params = {
    facility: store.rootGetters.activeFacilityId,
    type: TaskTypes.IMPORTUSERSFROMCSV,
    delete: deleting,
    dryrun: validate,
    locale: currentLanguage,
  };
  if (file) {
    params.csvfile = file;
  } else if (filename) {
    params.csvfilename = filename;
  }
  return TaskResource.startTask(params, true).then(task => {
    store.commit(commitStart, task);
    return task.id;
  });
}

function startValidating(store, payload) {
  store.commit('SET_DELETE_USERS', payload.deleteUsers);
  return startImportUsers(
    store,
    payload.file,
    null,
    payload.deleteUsers,
    true,
    'START_VALIDATE_USERS',
  );
}
function startSavingUsers(store) {
  return startImportUsers(
    store,
    null,
    store.getters.filename,
    store.getters.deleteUsers,
    false,
    'START_SAVE_USERS',
  );
}

function checkTaskStatus(store, newTasks, taskType, taskId, commitStart, commitFinish) {
  // if task job has already been fetched, just continually check if its completed
  if (taskId) {
    const task = newTasks.find(task => task.id === taskId);

    if (task && task.status === TaskStatuses.COMPLETED) {
      store.commit(commitFinish, task);
    } else if (task && task.status === TaskStatuses.FAILED) {
      if (typeof task.extra_metadata.overall_error === 'undefined') {
        store.dispatch('handleApiError', { error: task.traceback }, { root: true });
      }

      store.commit('SET_FAILED', task);
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
  return TaskResource.list()
    .then(data => {
      checkTaskStatus(
        store,
        data,
        TaskTypes.IMPORTUSERSFROMCSV,
        store.getters.taskId,
        'START_VALIDATE_USERS',
        'SET_FINISHED_IMPORT_USERS',
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
