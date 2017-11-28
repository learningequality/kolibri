import { Resource } from '../api-resource';

export default class UserProgressResource extends Resource {
  static resourceName() {
    return 'userprogress';
  }
  static idKey() {
    return 'id';
  }
}
