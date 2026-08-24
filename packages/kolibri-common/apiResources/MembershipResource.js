import { Resource } from 'kolibri/apiResource';

/**
 * @example Get all memberships for a given user
 * MembershipResource.list({ user_id: userId })
 */
export default new Resource({
  name: 'membership',
});
