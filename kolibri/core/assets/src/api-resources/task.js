const Resource = require('../api-resource').Resource;

class TaskResource extends Resource {
  static resourceName() {
    return 'task';
  }

  localExportContent(driveId) {
    const clientObj = { path: this.localExportUrl(), entity: { id: driveId } };
    return this.client(clientObj);
  }

  localImportContent(driveId) {
    const clientObj = { path: this.localImportUrl(), entity: { id: driveId } };
    return this.client(clientObj);
  }

  remoteImportContent(channelId) {
    const clientObj = { path: this.remoteImportUrl(), entity: { id: channelId } };
    return this.client(clientObj);
  }

  localDrive() {
    const clientObj = { path: this.localDriveUrl() };
    return this.client(clientObj);
  }

// TODO: switch to Model.delete()
  clearTask(taskId) {
    const clientObj = { path: this.clearTaskUrl(), entity: { id: taskId } };
    return this.client(clientObj);
  }

  get localExportUrl() {
    return this.urls[`${this.name}_startlocalexportchannel`]; // not yet implemented in api
  }
  get localImportUrl() {
    return this.urls[`${this.name}_startlocalimportchannel`];
  }
  get remoteImportUrl() {
    return this.urls[`${this.name}_startremoteimport`];
  }
  get localDriveUrl() {
    return this.urls[`${this.name}_localdrive`];
  }
  get clearTaskUrl() {
    return this.urls[`${this.name}_cleartask`];
  }
}

module.exports = TaskResource;
