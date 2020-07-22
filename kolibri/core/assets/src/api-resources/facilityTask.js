import { Resource } from 'kolibri.lib.apiResource';

export default new Resource({
  name: 'facilitytask',

  /**
   * @param {string} facility
   * @return {Promise}
   */
  dataportalsync(facility) {
    return this.postListEndpoint('startdataportalsync', {
      facility: facility.id,
      facility_name: facility.name,
    });
  },

  /**
   * @return {Promise}
   */
  dataportalbulksync() {
    return this.postListEndpoint('startdataportalbulksync');
  },

  /**
   * @return {Promise}
   */
  deleteFinishedTasks() {
    return this.postListEndpoint('deletefinishedtasks');
  },
  deleteFinishedTask(taskId) {
    return this.postListEndpoint('deletefinishedtasks', { task_id: taskId });
  },

  /**
   * Params for import/sync request
   * @param {string} baseurl - peer URL
   * @param {string} facility - facility ID
   * @param {string} username - username for admin (not needed if previously-imported)
   * @param {string} password - password for admin (not needed if previously-imported)
   */
  startpeerfacilityimport(...args) {
    // TODO clear out tasks for this facility from the queue before starting
    return this.postListEndpoint('startpeerfacilityimport', ...args);
  },
  startpeerfacilitysync(...args) {
    return this.postListEndpoint('startpeerfacilitysync', ...args);
  },
  startdataportalbulksync() {
    return this.postListEndpoint('startdataportalbulksync');
  },
  canceltask(taskId) {
    return this.postListEndpoint('canceltask', {
      task_id: taskId,
    });
  },
  cleartask(taskId) {
    return this.postListEndpoint('cleartask', {
      task_id: taskId,
    });
  },
  /**
   * @param {string} facility
   * @return {Promise}
   */
  deleteFacility(facilityId) {
    return this.postListEndpoint('startdeletefacility', { facility: facilityId }).then(response => {
      return response.data;
    });
  },
});
