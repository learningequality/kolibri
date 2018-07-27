import { Resource } from '../api-resource';

/**
 * @example <caption>Delete a channel</caption>
 * ChannelResource.getModel(channel_id).delete()
 *
 * @example Only get the channels that are "available" (i.e. with resources on device)
 * ChannelResource.getCollection({ available: true }).fetch()
 */
export default new Resource({
  name: 'channel',
});
