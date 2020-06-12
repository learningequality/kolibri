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

  deleteFinishedTasks() {
    return this.postListEndpoint('deletefinishedtasks');
  },

  /**
   * Params for import/sync request
   * @param {string} baseurl - peer URL
   * @param {string} facility - facility ID
   * @param {string} username - username for admin (not needed if previously-imported)
   * @param {string} password - password for admin (not needed if previously-imported)
   */
  startpeerfacilityimport(...args) {
    return this.postListEndpoint('startpeerfacilityimport', ...args);
  },
  startpeerfacilitysync(...args) {
    return this.postListEndpoint('startpeerfacilitysync', ...args);
  },
  startdataportalbulksync() {
    return this.postListEndpoint('startdataportalbulksync');
  },
});
