import { Resource } from 'kolibri/apiResource';

export default new Resource({
  name: 'lesson',
  fetchLessonsSizes(getParams = {}) {
    return this.fetchListCollection('size', getParams);
  },
});
