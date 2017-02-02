const KolibriModule = require('kolibri_module');

module.exports = class ContentRenderer extends KolibriModule {
  render(contentType) {
    const kind = contentType.split('/')[0];
    const extension = contentType.split('/')[1];
    // Check if it is an object and not null
    if ((this.contentType === new Object(this.contentType) &&
      // Check if it has kind as a key.
      this.contentType[kind] &&
      // Check if that kind has the extension in its array
      this.contentType[kind].includes(extension)) ||
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
