import { Resource } from '../api-resource';

/**
 * @example Get all memberships for a given user
 * MembershipResource.fetchCollection({ getParams: { user_id: userId } })
 */
export default new Resource({
  name: 'membership',
});
