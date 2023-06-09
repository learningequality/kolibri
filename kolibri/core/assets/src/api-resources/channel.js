import { Resource } from 'kolibri.lib.apiResource';
import { contentCacheClient } from './utils';

/**
 * @example Delete a channel
 * ChannelResource.deleteModel({ id: channel_id })
 *
 * @example Only get the channels that are "available" (i.e. with resources on device)
 * ChannelResource.fetchCollection({ getParams: { available: true } })
 */
export default new Resource({
  name: 'channel',
  client: contentCacheClient,
  fetchFilterOptions(id) {
    return this.getListEndpoint('filter_options', { id });
  },
});
