const Resource = require('../api-resource').Resource;

class ContentReportResource extends Resource {
  static resourceName() {
    return 'contentreport';
  }
}

module.exports = ContentReportResource;
