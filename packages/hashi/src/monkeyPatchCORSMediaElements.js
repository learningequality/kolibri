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
}
