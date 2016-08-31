const Resource = require('../api-resource').Resource;

class TaskResource extends Resource {
  static resourceName() {
    return 'task';
  }

  localExportContent(driveId) {
    const clientObj = { path: this.localExportUrl(), entity: { drive_id: driveId } };
    return this.client(clientObj);
  }

  localImportContent(driveId) {
    const clientObj = { path: this.localImportUrl(), entity: { drive_id: driveId } };
    return this.client(clientObj);
  }

  remoteImportContent(channelId) {
    const clientObj = { path: this.remoteImportUrl(), entity: { channel_id: channelId } };
    return this.client(clientObj);
  }

  localDrives() {
    const clientObj = { path: this.localDrivesUrl() };
    return this.client(clientObj);
  }

// TODO: switch to Model.delete()
  clearTask(taskId) {
    const clientObj = { path: this.clearTaskUrl(), entity: { id: taskId } };
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
  get localDrivesUrl() {
    return this.urls[`${this.name}_localdrive`];
  }
  get clearTaskUrl() {
    return this.urls[`${this.name}_cleartask`];
  }
}

module.exports = TaskResource;
