import { Resource } from 'kolibri/apiResource';

/**
 * @example Get a Collection of Exams for a given class
 * ExamResource.list({ collection: classId })
 */
export default new Resource({
  name: 'exam',
  idKey: 'id',
  async fetchQuizzesSizes(params = {}) {
    const response = await this.request({ action: 'size', params });
    return response.data;
  },
});
