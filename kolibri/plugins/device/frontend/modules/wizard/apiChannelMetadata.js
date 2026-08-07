import ChannelResource from '../../apiResources/deviceChannel';

// Gets Metadata for Channels whose DBs have been downloaded onto the server.
// Response includes all of the file/resource sizes.
export function getChannelWithContentSizes(channelId, filterPartialChannels = true) {
  const params = {
    include_fields: [
      'total_resources',
      'total_file_size',
      'on_device_resources',
      'on_device_file_size',
      'new_resource_count',
      'new_resource_total_size',
    ],
  };
  if (filterPartialChannels) {
    params.partial = false;
  }
  return ChannelResource.retrieve(channelId, { params });
}
