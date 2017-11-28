import { Resource } from '../api-resource';

export default class ExamLogResource extends Resource {
  static resourceName() {
    return 'examlog';
  }
  static idKey() {
    return 'id';
  }
}
