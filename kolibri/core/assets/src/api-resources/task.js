import pickBy from 'lodash/pickBy';
import { Resource } from 'kolibri.lib.apiResource';

export default new Resource({
  name: 'task',

  startTask(task) {
    return this.postList(task);
  },

  startTasks(tasks) {
    return this.postList(tasks);
  },

  /**
   * Initiates a Task that creates a csv file with the log data of the logger
   *
   * @param {string} params.logtype - session or summary
   * @returns {Promise}
   *
   */
  startexportlogcsv(params) {
    return this.postListEndpoint('startexportlogcsv', pickBy(params));
  },
  /**
   * Initiates a Task that import users, classes and assign roles from a csv file
   *
   * @param {object} params.csvfile - File object or filename (stored in kolibri temp dir)
   * @param {string} params.dryrun - validate objects but don't write in the db
   * @param {string} params.delete - delete users not included in the csv
   *                                 and clear not included classrooms
   * @returns {Promise}
   *
   */
  import_users_from_csv(params) {
    return this.postListEndpointMultipart('importusersfromcsv', pickBy(params));
  },
  /**
   * Initiates a Task that export users, classes and assign roles to a csv file
   * @returns {Promise}
   *
   */
  export_users_to_csv(params) {
    return this.postListEndpoint('exportuserstocsv', pickBy(params));
  },

  // TODO: switch to Model.delete()
  cancelTask(taskId) {
    return this.postListEndpoint('canceltask', {
      task_id: taskId,
    });
  },
  clearTask(taskId) {
    return this.postListEndpoint('cleartask', { task_id: taskId });
  },
  clearTasks() {
    return this.postListEndpoint('cleartasks');
  },

  deleteFinishedTasks() {
    return this.postListEndpoint('deletefinishedtasks');
  },

  deleteFinishedTask(taskId) {
    return this.postListEndpoint('deletefinishedtasks', { task_id: taskId });
  },
});
