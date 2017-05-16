const { Resource } = require('../api-resource');

/**
 * Information about files in content channels.
 * File API components are defined in 'content' app.
 *
 * @example <caption>Get a list of files for a content channel</caption>
 * FileResource.getCollection({ channel_id: channelId })
 */
class FileResource extends Resource {
  static resourceName() {
    return 'file';
  }

  static resourceIdentifiers() {
    return [
      'channel_id'
    ];
  }
}

module.exports = FileResource;
