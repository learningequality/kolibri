import Store from 'kolibri.coreVue.vuex.store';
import { Resource } from 'kolibri.lib.apiResource';

/**
 * TODO
 */
export default new Resource({
  name: 'contentnode_slim',

  useContentCacheKey: true,

  fetchAncestors(id) {
    return this.fetchDetailCollection('ancestors', id);
  },
  fetchRecommendationsFor(id, getParams) {
    return this.fetchDetailCollection('recommendations_for', id, getParams);
  },
  fetchResume(getParams) {
    return this.fetchDetailCollection('resume', Store.getters.currentUserId, getParams);
  },
  fetchPopular(getParams) {
    return this.fetchListCollection('popular', getParams);
  },
  fetchNextSteps(getParams) {
    return this.fetchDetailCollection('next_steps', Store.getters.currentUserId, getParams);
  },
});
