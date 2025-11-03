import { Resource } from 'kolibri/apiResource';
import client from 'kolibri/client';

export default new Resource({
  name: 'role',
  saveCollection({ data = [], getParams = {} } = {}) {
    return client({
      url: this.collectionUrl(),
      method: 'POST',
      params: getParams,
      data,
    });
  },
});
