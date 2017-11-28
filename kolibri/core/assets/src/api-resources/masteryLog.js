import { Resource } from '../api-resource';

export default class MasteryLogResource extends Resource {
  static resourceName() {
    return 'masterylog';
  }
  static idKey() {
    return 'pk';
  }
}
