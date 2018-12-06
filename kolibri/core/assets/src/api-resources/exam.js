import { Resource } from 'kolibri.lib.apiResource';

/**
 * @example Get a Collection of Exams for a given class
 * ExamResource.fetchCollection({ getParams: { collection: classId } })
 */
export default new Resource({
  name: 'exam',
  idKey: 'id',
});
