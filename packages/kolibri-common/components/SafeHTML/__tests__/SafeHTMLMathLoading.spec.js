import { render } from '@testing-library/vue';

// Every test here expects MathJax to stay unloaded. The module registry
// is per spec file, so loading them in any test would hide an eager import in
// the rest; MathJax-rendering tests live in SafeHTML.spec.js.
let mockMathFallbackLoaded = false;

jest.mock('mathjax-full/js/mathjax', () => {
  mockMathFallbackLoaded = true;
  return jest.requireActual('mathjax-full/js/mathjax');
});

jest.mock('kolibri', () => ({
  canHandleElement: jest.fn(() => false),
  objectViewerMimetypes: jest.fn(() => []),
}));

jest.mock('kolibri/urls');

describe('SafeHTML MathJax loading', () => {
  // Required, not imported: a hoisted import would evaluate an eager MathJax
  // import before the flag above is initialised, which would then reset it.
  let createSafeHTML;
  beforeAll(() => {
    ({ createSafeHTML } = require('../index'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not load MathJax for HTML without math', async () => {
    render(createSafeHTML(), { props: { html: '<p>x</p>' } });
    await global.flushPromises();
    expect(mockMathFallbackLoaded).toBe(false);
  });

  it('does not load MathJax when the browser lays out MathML', async () => {
    jest
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockReturnValue({ width: 77, height: 23 });
    render(createSafeHTML(), { props: { html: '<math><mi>x</mi></math>' } });
    await global.flushPromises();
    expect(mockMathFallbackLoaded).toBe(false);
  });
});
