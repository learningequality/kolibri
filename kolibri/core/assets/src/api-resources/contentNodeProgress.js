import { Resource } from '../api-resource';

export default class ContentNodeProgressResource extends Resource {
  static resourceName() {
    return 'contentnodeprogress';
  }
  static idKey() {
    return 'pk';
  }
}
