import { Resource } from 'kolibri/apiResource';
import urls from 'kolibri/urls';

export default new Resource({
  name: 'contentnodeprogress',
  /**
   * A method to request progress for paginated tree data from the backend.
   * @param {object} options - Request parameters.
   * @param {string} options.id - The id of the parent node for this request.
   * @param {object} options.params - The GET parameters to return more results;
   * may include both pagination and non-pagination specific parameters.
   * @returns {Promise<object>} Promise that resolves with the tree progress data.
   */
  fetchTree({ id, params }) {
    const url = urls['kolibri:core:contentnodeprogress_tree'](id);
    return this.client({ url, params }).then(response => {
      return response.data;
    });
  },
});
