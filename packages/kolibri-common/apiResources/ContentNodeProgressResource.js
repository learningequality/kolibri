import { Resource } from 'kolibri/apiResource';
import urls from 'kolibri/urls';

export default new Resource({
  name: 'contentnodeprogress',
  /**
   * A method to request progress for paginated tree data from the backend
   * @param {string} id - the id of the parent node for this request
   * @param {Object} params - the GET parameters to return more results,
   * may be both pagination and non-pagination specific parameters
   * @return {Promise<ContentNode>} Promise that resolves with the model data
   */
  fetchTree({ id, params }) {
    const url = urls['kolibri:core:contentnodeprogress_tree'](id);
    return this.client({ url, params }).then(response => {
      return response.data;
    });
  },
});
