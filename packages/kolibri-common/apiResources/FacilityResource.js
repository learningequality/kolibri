import { Resource } from 'kolibri/apiResource';

export default new Resource({
  name: 'facility',

  /**
   * Create a facility, resetting its dataset to the preset's default settings. Creating through
   * the list endpoint applies no preset.
   * @param {object} data - The facility to create, with `name` and `preset`
   * @returns {Promise} - Promise that resolves with an empty body
   */
  async createFacility(data) {
    const response = await this.request({ method: 'POST', action: 'create_facility', data });
    return response.data;
  },
});
