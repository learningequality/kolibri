import { Resource } from '../api-resource';

export default class ContentSummaryLogResource extends Resource {
  static resourceName() {
    return 'contentsummarylog';
  }
  static idKey() {
    return 'pk';
  }
}
