
const KolibriModule = require('kolibri_module');
const PDFComponent = require('./vue/index');
const Vue = require('vue');

class DocumentPDFModule extends KolibriModule {
  render(containerElement) {
    const options = {
      el: containerElement,
    };
    Object.assign(options, PDFComponent);
    this.vm = new Vue(options);
  }
}

module.exports = new DocumentPDFModule();
