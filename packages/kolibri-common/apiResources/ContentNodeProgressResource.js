import { Resource } from 'kolibri/apiResource';
import urls from 'kolibri/urls';

export default new Resource({
  name: 'contentnodeprogress',
  fetchTree({ id, params }) {
    const url = urls['kolibri:core:contentnodeprogress_tree'](id);
    return this.client({ url, params }).then(response => {
      return response.data;
    });
  },
});
