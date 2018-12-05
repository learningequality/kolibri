import patchCORSMediaElements from '../src/monkeyPatchCORSMediaElements';

describe('CORS Media Element patching', () => {
  function expectElementCORS(element) {
    expect(element.crossOrigin).toEqual('anonymous');
  }
  beforeEach(() => {
    patchCORSMediaElements();
  });
  describe('createElement patching', () => {
    const tagNames = ['img', 'audio', 'video', 'script'];
    tagNames.forEach(tag => {
      it(`should set crossOrigin to anonymous for all document.createElement returns for tagName ${tag}`, () => {
        const element = document.createElement(tag);
        expectElementCORS(element);
      });
      it(`should set crossOrigin to anonymous for all document.createElement returns for tagName ${tag.toUpperCase()}`, () => {
        const element = document.createElement(tag.toUpperCase());
        expectElementCORS(element);
      });
    });
  });
});
