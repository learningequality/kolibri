import { Resource } from 'kolibri/apiResource';

export default new Resource({
  name: 'session',

  /**
   * Create a session for the given credentials.
   * @param {object} data - The credentials to authenticate with
   * @param {object} [options] - Additional request options
   * @param {object} [options.params] - Query parameters. `prevalidate` must travel here: sent in
   * the body it is ignored, and the request creates a session instead of validating one.
   * @returns {Promise} - Promise that resolves with the session, or with `{ full_name }` when
   * prevalidating
   */
  async login(data, { params } = {}) {
    const response = await this.request({ method: 'POST', data, params });
    return response.data;
  },
});
