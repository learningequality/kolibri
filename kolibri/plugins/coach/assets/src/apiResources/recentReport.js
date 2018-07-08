import { Resource } from 'kolibri.lib.apiResource';

export default new Resource({
  name: 'kolibri:coach:recentreport',
  idKey: 'pk',
  resourceIds: ['channel_id', 'content_node_id', 'collection_kind', 'collection_id'],
});
