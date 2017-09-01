import { Resource } from 'kolibri.lib.apiResource';

export default class UserReportResource extends Resource {
  static resourceName() {
    return 'kolibri:coach:userreport';
  }
  static idKey() {
    return 'pk';
  }
  static resourceIdentifiers() {
    return ['channel_id', 'content_node_id', 'collection_kind', 'collection_id'];
  }
}
