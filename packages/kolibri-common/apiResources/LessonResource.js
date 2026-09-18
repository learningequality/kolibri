import { Resource } from 'kolibri/apiResource';

export default new Resource({
  name: 'lesson',
  async fetchLessonsSizes(params = {}) {
    const response = await this.request({ action: 'size', params });
    return response.data;
  },
});
