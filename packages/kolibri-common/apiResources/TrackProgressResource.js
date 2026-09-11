import { Resource } from 'kolibri/apiResource';

export default new Resource({
  name: 'trackprogress',

  /**
   * Update an existing content session. The endpoint implements no `partial_update`, so base
   * `update` - which PATCHes - would 405.
   * @param {string} sessionId - The id of the session to update
   * @param {object} data - The session update payload
   * @returns {Promise} - Promise that resolves with the updated session
   */
  async updateSession(sessionId, data) {
    const response = await this.request({
      method: 'PUT',
      action: 'detail',
      routeParams: sessionId,
      data,
    });
    return response.data;
  },
});
