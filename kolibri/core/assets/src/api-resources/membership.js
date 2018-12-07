import { Resource } from 'kolibri.lib.apiResource';

/**
 * @example Get all memberships for a given user
 * MembershipResource.fetchCollection({ getParams: { user_id: userId } })
 */
export default new Resource({
  name: 'membership',
});
