import ChannelResource from '../../apiResources/deviceChannel';

// Gets Metadata for Channels whose DBs have been downloaded onto the server.
// Response includes all of the file/resource sizes.
export function getChannelWithContentSizes(channelId) {
  return new Promise((resolve, reject) => {
    ChannelResource.fetchModel({
      id: channelId,
      getParams: {
        include_fields: [
          'total_resources',
          'total_file_size',
          'on_device_resources',
          'on_device_file_size',
        ],
      },
      force: true,
    }).then(resolve, reject);
  });
}
