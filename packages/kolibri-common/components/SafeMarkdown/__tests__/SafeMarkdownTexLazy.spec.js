import { render, screen } from '@testing-library/vue';

let mockTexLoaded = false;

jest.mock('mathjax-full/js/input/tex', () => {
  mockTexLoaded = true;
  return jest.requireActual('mathjax-full/js/input/tex');
});
jest.mock('kolibri', () => ({
  canHandleElement: jest.fn(() => false),
  objectViewerMimetypes: jest.fn(() => []),
}));
jest.mock('kolibri/urls');

describe('SafeMarkdown TeX input loading', () => {
  let SafeMarkdown;
  beforeAll(() => {
    SafeMarkdown = require('../index').default;
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loads the TeX input only once the text contains a formula', async () => {
    jest
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockReturnValue({ width: 77, height: 23 });
    const { updateProps } = render(SafeMarkdown, {
      props: { text: 'Plain **text**, `$x$` and ![$y$](/image)' },
    });
    await global.flushPromises();
    expect(mockTexLoaded).toBe(false);

    await updateProps({ text: '$x$' });
    await screen.findByRole('math', { hidden: true });
    expect(mockTexLoaded).toBe(true);
  });
});
