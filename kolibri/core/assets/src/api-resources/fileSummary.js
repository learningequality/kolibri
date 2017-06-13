const { Resource } = require('../api-resource');

/**
 * Provides the number of files and their total size for a given Channel
 *
 * @example <caption>Get the file summary for a Channel</caption>
 * FileSummaryResource.getCollection({ channel_id: channelId })
 */
class FileSummaryResource extends Resource {
  static resourceName() {
    return 'filesummary';
  }

  static resourceIdentifiers() {
    return [
      'channel_id',
    ];
  }
}

module.exports = FileSummaryResource;
