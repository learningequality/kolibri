import { Resource } from '../api-resource';

/**
 * TODO
 */
export default new Resource({
  name: 'contentnode_slim',

  fetchAncestors(id) {
    return this.fetchDetailCollection('ancestors', id);
  },
});
