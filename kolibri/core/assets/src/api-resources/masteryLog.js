import { Resource } from 'kolibri.lib.apiResource';

export default new Resource({
  name: 'masterylog',

  /**
   * Gets the list of mastery logs (tries) for a particular content and user combo, with:
   *  - `correct`: total correct for the try
   *
   * @param {String} content_id
   * @param {String} user_id
   * @return {Promise}
   */
  fetchSummary(content_id, user_id) {
    return this.fetchListCollection('summary', { content: content_id, user: user_id });
  },

  /**
   * Get's the diff of this mastery log compared with the previous attempt, with annotations:
   *  - `diff`: object or null, with `correct` and `time_spent` diffs
   *  - `attemptlogs`: list of attempt logs with annotated diff with previous try's attempt
   *
   * @param {String} id masterylog_id
   * @return {Promise}
   */
  fetchDiff(id) {
    return this.fetchDetailModel('diff', id);
  },
});
