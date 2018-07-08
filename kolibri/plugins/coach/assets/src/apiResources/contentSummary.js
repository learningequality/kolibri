import { Resource } from 'kolibri.lib.apiResource';

export default new Resource({
  name: 'kolibri:coach:contentsummary',
  idKey: 'pk',
  resourceIds: ['channel_id', 'collection_kind', 'collection_id'],
});
