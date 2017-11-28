import { Resource } from '../api-resource';

/**
 * @example <caption>Get all memberships for a given user</caption>
 * MembershipResource.getCollection({ user_id: userId })
 */
export default class MembershipResource extends Resource {
  static resourceName() {
    return 'membership';
  }
}
