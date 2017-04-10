const Resource = require('../api-resource').Resource;

/**
 * @example <caption>Get a Collection of Exams for a given class</caption>
 * ExamResource.getCollection({ collection: classId })
 */
class ExamResource extends Resource {
  static resourceName() {
    return 'exam';
  }
  static idKey() {
    return 'id';
  }
}

module.exports = ExamResource;
