import { Resource } from 'kolibri/apiResource';

/**
 * @example Delete a channel
 * ChannelResource.delete(channel_id)
 * @example Only get the channels that are "available" (i.e. with resources on device)
 * ChannelResource.list({ available: true })
 */
export default new Resource({
  name: 'channel',
  async fetchFilterOptions(id) {
    const { data } = await this.request({ action: 'filter_options', params: { id } });
    return data;
  },
});
