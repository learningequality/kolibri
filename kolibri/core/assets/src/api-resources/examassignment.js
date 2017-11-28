import { Resource } from '../api-resource';

export default class ExamAssignmentResource extends Resource {
  static resourceName() {
    return 'examassignment';
  }
  static idKey() {
    return 'id';
  }
}
