import { Resource } from '../api-resource';

/**
 * @example <caption>Get a Collection of Exams for a given class</caption>
 * ExamResource.getCollection({ collection: classId })
 */
export default class ExamResource extends Resource {
  static resourceName() {
    return 'exam';
  }
  static idKey() {
    return 'id';
  }
}
