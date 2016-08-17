const Resource = require('../api-resource').Resource;
const logging = require('logging').getLogger(__filename);

class TaskResource extends Resource {
  static resourceName() {
    return 'task';
  }

  localExportContent(driveId) {
    const promise = new Promise((resolve, reject) => {
      const clientObj = { path: this.localExportUrl(), entity: { id: driveId },
        headers: { 'Content-Type': 'application/json' } };
      this.client(clientObj).then((response) => {
        resolve(response.entity);
      }, (response) => {
        logging.error('An error occurred', response);
      });
    },
    (reject) => {
      reject(reject);
    });
    return promise;
  }

  localImportContent(driveId) {
    const promise = new Promise((resolve, reject) => {
      const clientObj = { path: this.localImportUrl(), entity: { id: driveId },
        headers: { 'Content-Type': 'application/json' } };
      this.client(clientObj).then((response) => {
        resolve(response.entity);
      }, (response) => {
        logging.error('An error occurred', response);
      });
    },
    (reject) => {
      reject(reject);
    });
    return promise;
  }

  remoteImportContent(channelId) {
    const promise = new Promise((resolve, reject) => {
      const clientObj = { path: this.remoteImportUrl(), entity: { id: channelId },
        headers: { 'Content-Type': 'application/json' } };
      this.client(clientObj).then((response) => {
        resolve(response.entity);
      }, (response) => {
        logging.error('An error occurred', response);
      });
    },
    (reject) => {
      reject(reject);
    });
    return promise;
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
