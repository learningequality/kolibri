const KolibriModule = require('kolibri_module');

module.exports = class ContentRenderer extends KolibriModule {
  get rendererComponent() {
    return null;
  }
  get contentType() {
    return null;
  }
};
