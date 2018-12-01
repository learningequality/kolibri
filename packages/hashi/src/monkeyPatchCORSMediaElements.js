export default function() {
  function setCrossOrigin(element) {
    element.crossOrigin = 'anonymous';
  }

  const originalCreateElement = document.createElement.bind(document);

  const corsTags = ['img', 'audio', 'video', 'script'];

  function createElement(tagName, options) {
    const element = originalCreateElement(tagName, options);

    if (corsTags.includes(tagName.toLowerCase())) {
      setCrossOrigin(element);
    }
    return element;
  }

  document.createElement = createElement.bind(document);

  const OriginalImage = window.Image;
  window.Image = function() {
    const image = new OriginalImage(arguments);
    setCrossOrigin(image);
    return image;
  };

  const OriginalAudio = window.Audio;
  window.Audio = function() {
    const audio = new OriginalAudio(arguments);
    setCrossOrigin(audio);
    return audio;
  };
}
