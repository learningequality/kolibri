import { Resource } from 'kolibri/apiResource';

export default new Resource({
  name: 'quizdifficulties',
  namespace: 'kolibri.plugins.coach',
  fetchDifficultQuestions(id, params) {
    return this.retrieve(id, { params });
  },
});
