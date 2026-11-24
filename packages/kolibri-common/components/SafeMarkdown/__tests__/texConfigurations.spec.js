import { ConfigurationHandler } from 'mathjax-full/js/input/tex/Configuration';
import { TagsFactory } from 'mathjax-full/js/input/tex/Tags';
import { TEX_PACKAGES, createTexRenderer } from '../tex';

describe('TeX to MathML', () => {
  it('leaves shared MathJax handler selection unchanged', () => {
    jest.isolateModules(() => {
      const { mathjax } = require('mathjax-full/js/mathjax');
      const { browserAdaptor } = require('mathjax-full/js/adaptors/browserAdaptor');
      const { RegisterHTMLHandler } = require('mathjax-full/js/handlers/html');

      require('../tex');
      const viewerHandler = RegisterHTMLHandler(browserAdaptor());
      expect(mathjax.handlers.handlesDocument('')).toBe(viewerHandler);
    });
  });
  it('registers every configured package', () => {
    expect(TEX_PACKAGES.filter(name => !ConfigurationHandler.get(name))).toEqual([]);
  });

  it('serializes a display fraction as left-to-right MathML', () => {
    const mml = createTexRenderer()(String.raw`\frac{1}{2}`, true);
    expect(mml).toMatch(/^<math\b[^>]*dir="ltr"/);
    expect(mml).toContain('display="block"');
    expect(mml).toContain('<mfrac>');
  });

  it('registers no tags class per render', () => {
    const add = jest.spyOn(TagsFactory, 'add');
    createTexRenderer()('x^2', false);
    createTexRenderer()('x^2', false);
    expect(add).not.toHaveBeenCalled();
    add.mockRestore();
  });
});
