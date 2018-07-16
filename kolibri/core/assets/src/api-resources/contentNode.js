import { Resource } from '../api-resource';

export default new Resource({
  name: 'contentnode',
  fetchDescendantsCollection(id, getParams = {}) {
    return this.fetchDetailCollection('descendants', id, getParams);
  },
  fetchAncestors(id) {
    return this.fetchDetailCollection('ancestors', id);
  },
  fetchCopies(content_id) {
    return this.fetchDetailCollection('copies', content_id);
  },
  fetchCopiesCount(getParams = {}) {
    return this.fetchListCollection('copies-count', getParams);
  },
  fetchNextContent(id) {
    return this.fetchDetailModel('next_content', id);
  },
});
