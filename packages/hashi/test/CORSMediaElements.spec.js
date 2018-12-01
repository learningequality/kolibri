import patchCORSMediaElements from '../src/monkeyPatchCORSMediaElements';

describe('CORS Media Element patching', () => {
  function expectElementCORS(element) {
    expect(element.crossOrigin).toEqual('anonymous');
  }
  beforeEach(() => {
    patchCORSMediaElements();
  });
  describe('constructor patching', () => {
    it('should set crossOrigin to anonymous for all Image constructor returns', () => {
      const image = new Image();
      expectElementCORS(image);
    });
    it('should still return an object of type HTMLImageElement from the Image constructor', () => {
      const image = new Image();
      expect(image).toBeInstanceOf(HTMLImageElement);
    });
    it('should set crossOrigin to anonymous for all Audio constructor returns', () => {
      const audio = new Audio();
      expectElementCORS(audio);
    });
    it('should still return an object of type HTMLAudioElement from the Audio constructor', () => {
      const audio = new Audio();
      expect(audio).toBeInstanceOf(HTMLAudioElement);
    });
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
