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

  get localExportUrl() {
    return this.urls[`${this.name}_list/startlocalexportchannel`]; // not yet implemented in api
  }
  get localImportUrl() {
    return this.urls[`${this.name}_list/startlocalimportchannel`];
  }
  get remoteImportUrl() {
    return this.urls[`${this.name}_list/startremoteimport`];
  }
}

module.exports = TaskResource;
