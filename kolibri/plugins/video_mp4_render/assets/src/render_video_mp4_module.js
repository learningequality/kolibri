
// This is aliased for your convenience!
const KolibriModule = require('kolibri_module');

const VideoMP4Module = KolibriModule.extend({
  render(contentData, renderArea) {
    const videoTag = document.createElement('video');
    videoTag.autoplay = true;
    videoTag.src = 'http://vid297.photobucket.com/albums/mm238/daystar170/RickRoll.mp4';
    const titleTag = document.createElement('h1');
    titleTag.innerHTML = contentData.id;
    renderArea.appendChild(titleTag);
    renderArea.appendChild(videoTag);
  },
});

module.exports = new VideoMP4Module();
