const Resource = require('../api-resource').Resource;

/**
 * @example <caption>Delete a channel</caption>
 * ChannelResource.getModel(channel_id).delete()
 */
class ChannelResource extends Resource {
  static resourceName() {
    return 'channel';
  }
}

module.exports = ChannelResource;
