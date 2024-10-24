import { Resource } from 'kolibri/apiResource';

export default new Resource({
  name: 'masterylog',
  /**
   * Get's the diff of the most recent mastery log compared with the previous attempt, for
   * this content_id and user_id pair.
   * with annotations:
   *  - `diff`: object or null, with `correct` and `time_spent` diffs
   *  - `attemptlogs`: list of attempt logs with annotated diff with previous try's attempt
   *
   * @param {Object} parameters - the parameters to be used for the fetch
   * @param {String} parameters.content - the content_id of the relevant assessment
   * @param {String} parameters.user - the id of the user
   * @param {Number} parameters.back - the integer count back to go - defaults to 0
   * @param {Boolean} parameters.complete - whether to only return completed tries
   * @param {Boolean} parameters.quiz - whether this is for a quiz
   * @return {Promise}
   */
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
