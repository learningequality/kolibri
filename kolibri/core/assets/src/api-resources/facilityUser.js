const Resource = require('../api-resource').Resource;
const logging = require('kolibri.lib.logging').getLogger(__filename);

class FacilityUserResource extends Resource {
  static resourceName() {
    return 'facilityuser';
  }

  getCurrentFacility() {
    const promise = new Promise((resolve, reject) => {
      this.client({ path: this.currentFacilityUrl() }).then((response) => {
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

  get currentFacilityUrl() {
    return this.urls[`currentfacility_list`];
  }

}

module.exports = FacilityUserResource;
