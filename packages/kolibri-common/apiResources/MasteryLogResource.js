import { Resource } from 'kolibri/apiResource';

export default new Resource({
  name: 'masterylog',
  fetchMostRecentDiff({ content, user, back, complete, quiz } = {}) {
    return this.client({
      url: this.getUrlFunction('diff')(back),
      method: 'get',
      params: {
        content,
        user,
        complete,
        quiz,
      },
    }).then(response => response.data);
  },
});
