import { Resource } from '../api-resource';

export default class ContentNodeGranularResource extends Resource {
  static resourceName() {
    return 'contentnode_granular';
  }

  static idKey() {
    return 'pk';
  }
}
