import { Resource } from '../api-resource';

export default class ExamAttemptLogResource extends Resource {
  static resourceName() {
    return 'examattemptlog';
  }
  static idKey() {
    return 'id';
  }
}
