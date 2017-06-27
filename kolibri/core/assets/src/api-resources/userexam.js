import { Resource } from '../api-resource';

export default class UserExamResource extends Resource {
  static resourceName() {
    return 'userexam';
  }
  static idKey() {
    return 'id';
  }
}
