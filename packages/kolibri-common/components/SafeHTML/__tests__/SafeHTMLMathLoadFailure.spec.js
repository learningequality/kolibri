import { h } from 'vue';
import { render, waitFor } from '@testing-library/vue';
import { createSafeHTML } from '../index';

const LOAD_ERROR = 'ChunkLoadError';

jest.mock('mathjax-full/js/mathjax', () => {
  throw new Error(LOAD_ERROR);
});

jest.mock('kolibri', () => ({
  canHandleElement: jest.fn(() => false),
  objectViewerMimetypes: jest.fn(() => []),
}));

describe('SafeHTML when MathJax fails to load', () => {
  it('exposes the native math to assistive technology', async () => {
    const SafeHTML = createSafeHTML();
    const errorCaptured = jest.fn(() => false);
    const { container } = render({
      errorCaptured,
      render: () => h(SafeHTML, { props: { html: '<math><mi>x</mi></math>' } }),
    });
    await waitFor(() =>
      expect(errorCaptured).toHaveBeenCalledWith(
        expect.objectContaining({ message: LOAD_ERROR }),
        expect.anything(),
        expect.anything(),
      ),
    );
    expect(container.querySelector('math.safe-html:not([aria-hidden])')).not.toBeNull();
  });
});
