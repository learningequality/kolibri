/*
 * Polyfills for Element.append and Element.prepend
 * Because Babel and corejs do not polyfill Web APIs, only language features.
 */

const toPolyfill = [Element.prototype, Document.prototype, DocumentFragment.prototype];

for (const item of toPolyfill) {
  if (Object.prototype.hasOwnProperty.call(item, 'append')) {
    continue;
  }
  // See https://developer.mozilla.org/en-US/docs/Web/API/Element/append
  Object.defineProperty(item, 'append', {
    configurable: true,
    enumerable: true,
    writable: true,
    value: function append() {
      const argArr = Array.prototype.slice.call(arguments);
      const docFrag = document.createDocumentFragment();

      for (const argItem of argArr) {
        docFrag.appendChild(
          argItem instanceof Node ? argItem : document.createTextNode(String(argItem)),
        );
      }

      this.appendChild(docFrag);
    },
  });
}

for (const item of toPolyfill) {
  if (Object.prototype.hasOwnProperty.call(item, 'prepend')) {
    continue;
  }
  // See https://developer.mozilla.org/en-US/docs/Web/API/Element/prepend
  Object.defineProperty(item, 'prepend', {
    configurable: true,
    enumerable: true,
    writable: true,
    value: function prepend() {
      const argArr = Array.prototype.slice.call(arguments);
      const docFrag = document.createDocumentFragment();

      for (const argItem of argArr) {
        docFrag.appendChild(
          argItem instanceof Node ? argItem : document.createTextNode(String(argItem)),
        );
      }

      this.insertBefore(docFrag, this.firstChild);
    },
  });
}
