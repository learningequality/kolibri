import { Resource } from '../api-resource';

/**
 * TODO
 */
export default new Resource({
  name: 'contentnode_slim',

  fetchAncestors(id) {
    return this.fetchDetailCollection('ancestors', id);
  },
  fetchRecommendationsFor(id, getParams) {
    return this.fetchDetailCollection('recommendations_for', id, getParams);
  },
  fetchResume(getParams) {
    return this.fetchListCollection('resume', getParams);
  },
  fetchPopular(getParams) {
    return this.fetchListCollection('popular', getParams);
  },
  fetchNextSteps(getParams) {
    return this.fetchListCollection('next_steps', getParams);
  },
});
