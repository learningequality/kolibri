import logger from 'kolibri.lib.logging';
import urls from 'kolibri.urls';
import { Resource } from '../api-resource';

const logging = logger.getLogger(__filename);

export default new Resource({
  name: 'facilityuser',
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
  },

  get currentFacilityUrl() {
    return () => urls[`currentfacility_list`]();
  },
});
