const KolibriModule = require('kolibri_module');

module.exports = class ContentRenderer extends KolibriModule {
  render() {
    this.emit(`component_render:${this.contentType}`, this.rendererComponent);
  }
  get rendererComponent() {
    return null;
  }
  get contentType() {
    return null;
  }
};
