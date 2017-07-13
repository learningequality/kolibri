import { Resource } from 'kolibri.lib.apiResource';

export default class ContentSummaryResource extends Resource {
  static resourceName() {
    return 'kolibri:coach:contentsummary';
  }
  static idKey() {
    return 'pk';
  }
  static resourceIdentifiers() {
    return ['channel_id', 'collection_kind', 'collection_id'];
  }
}
