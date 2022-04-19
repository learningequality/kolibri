import { Resource } from 'kolibri.lib.apiResource';
import urls from 'kolibri.urls';
import ConditionalPromise from '../conditionalPromise';

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
    const promise = new ConditionalPromise();
    const url = urls['kolibri:core:contentnodeprogress_tree'](id);
    promise._promise = this.client({ url, params }).then(response => {
      return response.data;
    });
    return promise;
  },
});
