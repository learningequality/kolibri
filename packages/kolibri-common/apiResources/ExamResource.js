import { Resource } from 'kolibri/apiResource';

/**
 * @example Get a Collection of Exams for a given class
 * ExamResource.fetchCollection({ getParams: { collection: classId } })
 */
export default new Resource({
  name: 'exam',
  idKey: 'id',
  fetchQuizzesSizes(getParams = {}) {
    return this.fetchListCollection('size', getParams);
  },
});
