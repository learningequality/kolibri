const Resource = require('../api-resource').Resource;

class ContentReportResource extends Resource {
  static resourceName() {
    return 'contentreport';
  }

  /*
   get collectionUrl() {
   // idk
   return (...args) => this.urls[`kolibri:coachtools:${this.name}_list`](...args);
   }
   */
}

module.exports = ContentReportResource;
