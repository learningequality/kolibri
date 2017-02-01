const KolibriModule = require('kolibri_module');

module.exports = class ContentRenderer extends KolibriModule {
  render(contentType) {
    if ((Array.isArray(this.contentType) && this.contentType.includes(contentType)) ||
      this.contentType === contentType) {
      this.broadcastComponent(contentType);
    }
  }
  broadcastComponent(contentType) {
    this.emit(`component_render:${contentType}`, this.rendererComponent);
  }
  get rendererComponent() {
    return null;
  }
  get contentType() {
    return null;
  }
};
