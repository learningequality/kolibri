import { Resource } from '../api-resource';

/**
 * @example <caption>Delete a channel</caption>
 * ChannelResource.getModel(channel_id).delete()
 */
export default class ChannelResource extends Resource {
  static resourceName() {
    return 'channel';
  }
}
