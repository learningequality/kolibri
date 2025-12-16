import ChannelResource from '../../apiResources/deviceChannel';

// Gets Metadata for Channels whose DBs have been downloaded onto the server.
// Response includes all of the file/resource sizes.
export function getChannelWithContentSizes(channelId, filterPartialChannels = true) {
  const getParams = {
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
    getParams.partial = false;
  }
  return new Promise((resolve, reject) => {
    ChannelResource.fetchModel({
      id: channelId,
      getParams,
      force: true,
    }).then(resolve, reject);
  });
}
