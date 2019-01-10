import pickBy from 'lodash/pickBy';
import { Resource } from 'kolibri.lib.apiResource';

export default new Resource({
  name: 'task',

  /**
   * Initiates a Task that imports a Channel Metadata DB from a remote source
   *
   * @param {string} params.channel_id -
   * @param {string} [params.baseurl]
   *
   */
  startRemoteChannelImport(params) {
    return this.postListEndpoint('startremotechannelimport', pickBy(params));
  },

  /**
   * Initiates a Task that imports a Channel Metadata DB from a local drive
   *
   * @param {string} params.channel_id -
   * @param {string} params.drive_id -
   *
   */
  startDiskChannelImport({ channel_id, drive_id }) {
    return this.postListEndpoint('startdiskchannelimport', {
      channel_id,
      drive_id,
    });
  },

  /**
   * Initiates a Task that imports Channel Content from a remote source
   *
   * @param {string} params.channel_id -
   * @param {string} [params.baseurl] - URL of remote source (defaults to Kolibri Studio)
   * @param {Array<string>} [params.node_ids] -
   * @param {Array<string>} [params.exclude_node_ids] -
   * @returns {Promise}
   *
   */
  startRemoteContentImport(params) {
    return this.postListEndpoint('startremotecontentimport', pickBy(params));
  },

  /**
   * Initiates a Task that imports Channel Content from a local drive
   *
   * @param {string} params.channel_id -
   * @param {string} params.drive_id -
   * @param {Array<string>} [params.node_ids] -
   * @param {Array<string>} [params.exclude_node_ids] -
   * @returns {Promise}
   *
   */
  startDiskContentImport(params) {
    return this.postListEndpoint('startdiskcontentimport', pickBy(params));
  },

  /**
   * Initiates a Task that exports) Channel Content to a local drive
   *
   * @param {string} params.channel_id -
   * @param {string} params.drive_id -
   * @param {Array<string>} [params.node_ids] -
   * @param {Array<string>} [params.exclude_node_ids] -
   * @returns {Promise}
   *
   */
  startDiskContentExport(params) {
    // Not naming it after URL to keep internal consistency
    return this.postListEndpoint('startdiskexport', pickBy(params));
  },

  /**
   * Initiates a Task that annotates the importability of content onto the database
   * dependent on the current import method.
   */
  startAnnotateImportability(params) {
    return this.postListEndpoint('startannotateimportable', pickBy(params));
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

  deleteChannel(channelId) {
    return this.postListEndpoint('startdeletechannel', {
      channel_id: channelId,
    });
  },

  localDrives() {
    return this.getListEndpoint('localdrive');
  },

  // TODO: switch to Model.delete()
  cancelTask(taskId) {
    return this.postListEndpoint('canceltask', {
      task_id: taskId,
    });
  },

  clearTasks() {
    return this.postListEndpoint('cleartasks');
  },

  deleteFinishedTasks() {
    return this.postListEndpoint('deletefinishedtasks');
  },
});
