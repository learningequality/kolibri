
// This is aliased for your convenience!
const KolibriModule = require('kolibri_module');

const DocumentPDFModule = KolibriModule.extend({

  render(contentData, renderArea) {
    const documentTag = document.createElement('a');
    documentTag.href = 'http://www.benlandis.com/sheet-music/piano-rickroll.pdf';
    documentTag.textContent = contentData.id;
    const titleTag = document.createElement('h1');
    titleTag.innerHTML = contentData.id;
    renderArea.appendChild(titleTag);
    renderArea.appendChild(documentTag);
  },
});

module.exports = new DocumentPDFModule();
