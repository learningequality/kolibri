import { Resource } from '../api-resource';

/**
 * @example <caption>Get current session</caption>
 * SessionResource.getModel('current')
 */
export default class SessionResource extends Resource {
  static resourceName() {
    return 'session';
  }
}
