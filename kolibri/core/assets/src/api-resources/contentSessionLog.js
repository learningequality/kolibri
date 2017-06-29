import { Resource } from '../api-resource';

export default class ContentSessionLogResource extends Resource {
  static resourceName() {
    return 'contentsessionlog';
  }
  static idKey() {
    return 'pk';
  }
}
