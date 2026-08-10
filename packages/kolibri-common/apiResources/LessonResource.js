import { Resource } from 'kolibri/apiResource';

export default new Resource({
  name: 'lesson',
  fetchLessonsSizes(getParams = {}) {
    return this.fetchListCollection('size', getParams);
  },
  async fetchLessonsSizes_v2(params = {}) {
    const response = await this.request({ action: 'size', params });
    return response.data;
  },
});
