import { Resource } from 'kolibri.lib.apiResource';

export default class UserSummaryResource extends Resource {
  static resourceName() {
    return 'kolibri:coach:contentreport';
  }
  static idKey() {
    return 'pk';
  }
  static resourceIdentifiers() {
    return [
      'channel_id',
      'content_node_id',
    ];
  }
}
