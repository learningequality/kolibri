import { Resource } from 'kolibri/apiResource';
import client from 'kolibri/client';

/**
 * @example Get all memberships for a given user
 * MembershipResource.fetchCollection({ getParams: { user_id: userId } })
 */
export default new Resource({
  name: 'membership',
  saveCollection({ data = [], getParams = {} } = {}) {
    return client({
      url: this.collectionUrl(),
      method: 'POST',
      params: getParams,
      data,
    });
  },
});
