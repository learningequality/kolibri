import { Resource } from 'kolibri.lib.apiResource';

export default new Resource({
  name: 'attemptlog',

  /**
   * Return attempt logs with previous attempt diff annotated on each attempt. If there wasn't a
   * prior attempt, the diff will be null, otherwise an object with key `correct`
   *
   * @param {String|null} masterylog_id
   * @param {String|null} content_id
   * @param {String|null} item
   * @param {String|null} user_id
   * @return {Promise}
   */
  fetchCollectionWithDiff(masterylog_id = null, content_id = null, item = null, user_id = null) {
    // requires masterylog or content_id with item or user_id
    if (!masterylog_id && !(content_id && (item || user_id))) {
      return Promise.reject(Error('Missing required parameters'));
    }

    const getParams = {};
    if (masterylog_id) {
      getParams.masterylog = masterylog_id;
    }
    if (content_id) {
      getParams.content = content_id;
    }
    if (user_id) {
      getParams.user = user_id;
    }
    if (item) {
      getParams.item = item;
    }
    return this.fetchListCollection('diff', getParams);
  },
});
