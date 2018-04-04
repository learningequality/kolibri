import logger from 'kolibri.lib.logging';
import { Resource } from '../api-resource';

const logging = logger.getLogger(__filename);

export default class FacilityUserResource extends Resource {
  static resourceName() {
    return 'facilityuser';
  }

  getCurrentFacility() {
    const promise = new Promise(
      resolve => {
        this.client({ path: this.currentFacilityUrl() }).then(
          response => {
            resolve(response.entity);
          },
          response => {
            logging.error('An error occurred', response);
          }
        );
      },
      reject => {
        reject(reject);
      }
    );
    return promise;
  }

  get currentFacilityUrl() {
    return this.urls[`currentfacility_list`];
  }
}
