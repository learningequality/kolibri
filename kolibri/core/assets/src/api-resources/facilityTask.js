import { Resource } from 'kolibri.lib.apiResource';

export default new Resource({
  name: 'facilitytask',

  /**
   * @param {string} facility
   * @return {Promise}
   */
  dataportalsync(facility) {
    return this.postListEndpoint('startdataportalsync', { facility });
  },

  /**
   * @return {Promise}
   */
  dataportalbulksync() {
    return this.postListEndpoint('startdataportalbulksync');
  },
});
