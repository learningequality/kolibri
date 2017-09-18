import { Resource } from '../api-resource';

export default class TaskResource extends Resource {
  static resourceName() {
    return 'task';
  }

  localExportContent(driveId) {
    const clientObj = {
      path: this.localExportUrl(),
      entity: { drive_id: driveId },
    };
    return this.client(clientObj);
  }

  localImportContent(driveId) {
    const clientObj = {
      path: this.localImportUrl(),
      entity: { drive_id: driveId },
    };
    return this.client(clientObj);
  }

  remoteImportContent(channelId) {
    const clientObj = {
      path: this.remoteImportUrl(),
      entity: { channel_id: channelId },
    };
    return this.client(clientObj);
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

  get localExportUrl() {
    return this.urls[`${this.name}_startlocalexport`];
  }
  get localImportUrl() {
    return this.urls[`${this.name}_startlocalimport`];
  }
  get remoteImportUrl() {
    return this.urls[`${this.name}_startremoteimport`];
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
