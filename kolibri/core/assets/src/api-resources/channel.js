import { Resource } from '../api-resource';

/**
 * @example <caption>Delete a channel</caption>
 * ChannelResource.getModel(channel_id).delete()
 *
 * @example Only get the channels that are "available" (i.e. with resources on device)
 * ChannelResource.getCollection().fetch({ available: true })
 */
export default class ChannelResource extends Resource {
  static resourceName() {
    return 'channel';
  }
  static usesContentCacheKey() {
    return true;
  }
}
