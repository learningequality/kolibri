import { Resource } from 'kolibri/apiResource';

/**
 * @example Get Datasets for a given Facility
 * FacilityDatasetResource.list({ facility_id: 1 })
 */
export default new Resource({
  name: 'facilitydataset',

  /**
   * Set the facility PIN.
   * @param {string} id - The id of the dataset
   * @param {object} data - The PIN payload, including `pin_code`
   * @returns {Promise} - Promise that resolves with the updated dataset
   */
  async setPin(id, data) {
    const response = await this.request({
      method: 'POST',
      action: 'update_pin',
      routeParams: id,
      data,
    });
    return response.data;
  },

  /**
   * Clear the facility PIN. An absent `pin_code` is what clears it, and the endpoint rejects
   * that on POST - hence the PATCH.
   * @param {string} id - The id of the dataset
   * @returns {Promise} - Promise that resolves with the updated dataset
   */
  async unsetPin(id) {
    const response = await this.request({
      method: 'PATCH',
      action: 'update_pin',
      routeParams: id,
    });
    return response.data;
  },

  /**
   * Save the facility login and picture password settings.
   * @param {string} id - The id of the dataset
   * @param {object} data - The login settings to save
   * @returns {Promise} - Promise that resolves with `{ dataset, task? }`, where `task` is only
   * present when applying the settings was deferred to a background job
   */
  async saveLoginSettings(id, data) {
    const response = await this.request({
      method: 'PATCH',
      action: 'save_facility_login_settings',
      routeParams: id,
      data,
    });
    return response.data;
  },
});
