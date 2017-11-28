import { Resource } from '../api-resource';

export default class AttemptLogResource extends Resource {
  static resourceName() {
    return 'attemptlog';
  }
  static idKey() {
    return 'id';
  }
}
