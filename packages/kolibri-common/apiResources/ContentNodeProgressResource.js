import { Resource } from 'kolibri/apiResource';

export default new Resource({
  name: 'contentnodeprogress',
  /**
   * A method to request progress for paginated tree data from the backend.
   * @param {object} options - Request parameters.
   * @param {string} options.id - The id of the parent node for this request.
   * @param {object} options.params - The GET parameters to return more results;
   * may include both pagination and non-pagination specific parameters.
   * @returns {Promise<object[]>} Promise that resolves with a progress record for each non-topic
   * node in the tree the user has interacted with.
   */
  async fetchTree({ id, params }) {
    const { data } = await this.request({ action: 'tree', routeParams: id, params });
    return data;
  },
});
