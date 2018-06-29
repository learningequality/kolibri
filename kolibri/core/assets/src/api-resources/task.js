import pickBy from 'lodash/pickBy';
import { Resource } from '../api-resource';

export default class TaskResource extends Resource {
  static resourceName() {
    return 'task';
  }

  /**
   * Initiates a Task that imports a Channel Metadata DB from a remote source
   *
   * @param {string} channel_id -
   *
   */
  startRemoteChannelImport({ channel_id }) {
    return this.client({
      path: this.urls[`${this.name}_startremotechannelimport`](),
      method: 'POST',
      entity: {
        channel_id,
      },
    });
  }

  /**
   * Initiates a Task that imports a Channel Metadata DB from a local drive
   *
   * @param {string} params.channel_id -
   * @param {string} params.drive_id -
   *
   */
  startDiskChannelImport({ channel_id, drive_id }) {
    return this.client({
      path: this.urls[`${this.name}_startdiskchannelimport`](),
      method: 'POST',
      entity: {
        channel_id,
        drive_id,
      },
    });
  }

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
    return this.client({
      path: this.urls[`${this.name}_startremotecontentimport`](),
      method: 'POST',
      entity: pickBy(params),
    });
  }

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
    return this.client({
      path: this.urls[`${this.name}_startdiskcontentimport`](),
      method: 'POST',
      entity: pickBy(params),
    });
  }

  /**
   * Initiates a Task that exports Channel Content to a local drive
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
    return this.client({
      path: this.urls[`${this.name}_startdiskexport`](),
      method: 'POST',
      entity: pickBy(params),
    });
  }

  /**
   * Gets all the Tasks outside of the Resource Layer mechanism
   *
   */
  getTasks() {
    return this.client({
      path: this.urls[`${this.name}_list`](),
      method: 'GET',
    });
  }

  deleteChannel(channelId) {
    const clientObj = {
      path: this.deleteChannelUrl(),
      entity: { channel_id: channelId },
    };
    return this.client(clientObj);
  }

  localDrives() {
    const clientObj = { path: this.localDrivesUrl() };
    return this.client(clientObj);
  }

  // TODO: switch to Model.delete()
  cancelTask(taskId) {
    const clientObj = {
      path: this.cancelTaskUrl(),
      entity: { task_id: taskId },
    };
    return this.client(clientObj);
  }

  clearTasks() {
    const clientObj = {
      path: this.clearTasksUrl(),
      entity: {},
    };
    return this.client(clientObj);
  }
  get deleteChannelUrl() {
    return this.urls[`${this.name}_startdeletechannel`];
  }
  get localDrivesUrl() {
    return this.urls[`${this.name}_localdrive`];
  }
  get cancelTaskUrl() {
    return this.urls[`${this.name}_canceltask`];
  }
  get clearTasksUrl() {
    return this.urls[`${this.name}_cleartasks`];
  }
}
