const Resource = require('../api-resource').Resource;

class ExamResource extends Resource {
  static resourceName() {
    return 'exam';
  }
  static idKey() {
    return 'id';
  }

  /**
   * Returns a Collection of Exams filtered by a collectionId
   * @param {string} collectionId - e.g. a classId
   * @returns {Collection<Exam>}
   */
  getCollectionForClass(collectionId) {
    return super.getCollection({ collection: collectionId });
  }
}

module.exports = ExamResource;
