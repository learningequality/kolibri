const Resource = require('../api-resource').Resource;
const logging = require('logging').getLogger(__filename);

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

  login(payload) {
    const promise = new Promise((resolve, reject) => {
      this.client({ path: this.loginUrl(), entity: payload, method: 'POST',
      headers: { 'Content-Type': 'application/json' } }).then((response) => {
        console.log('login called in facilityResource.js');
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

  logout() {
    const promise = new Promise((resolve, reject) => {
      this.client({ path: this.logoutUrl(), method: 'POST' }).then((response) => {
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

  get loginUrl() {
    return this.urls[`login`];
  }

  get logoutUrl() {
    return this.urls[`logout`];
  }

}

module.exports = FacilityUserResource;
