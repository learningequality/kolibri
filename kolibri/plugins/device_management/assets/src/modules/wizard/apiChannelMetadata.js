import ChannelResource from '../../apiResources/deviceChannel';

// Gets Metadata for Channels whose DBs have been downloaded onto the server.
// Response includes all of the file/resource sizes.
export function getChannelWithContentSizes(channelId) {
  return new Promise((resolve, reject) => {
    ChannelResource.fetchModel({
      id: channelId,
      force: true,
    }).then(resolve, reject);
  });
}
