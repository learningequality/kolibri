import { Resource } from 'kolibri.lib.apiResource';

/**
 * @example Delete a channel
 * ChannelResource.deleteModel({ id: channel_id })
 *
 * @example Only get the channels that are "available" (i.e. with resources on device)
 * ChannelResource.fetchCollection({ getParams: { available: true } })
 */
export default new Resource({
  name: 'channel',
  useContentCacheKey: true,
});
