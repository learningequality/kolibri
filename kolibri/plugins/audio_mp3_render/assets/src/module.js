
// This is aliased for your convenience!
const KolibriModule = require('kolibri_module');

class AudioMP3Module extends KolibriModule {
  render(contentData, renderArea) {
    const audioTag = document.createElement('audio');
    audioTag.autoplay = true;
    audioTag.src = 'https://freemusicarchive.org/music/download/8a46d5ff69d7c426d2a0a6854d96a683dec17802';
    audioTag.controls = true;
    const titleTag = document.createElement('h1');
    titleTag.innerHTML = contentData.id;
    renderArea.appendChild(titleTag);
    renderArea.appendChild(audioTag);
  }
}

module.exports = new AudioMP3Module();
