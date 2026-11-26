import { render, screen } from '@testing-library/vue';
import Vue from 'vue';
import SafeMarkdown from '../index';

let mockFailedImport;
const mockImportAttempt = jest.fn();
let mockResolveTex;
let mockTexReady;

jest.mock('kolibri', () => ({
  canHandleElement: jest.fn(),
  objectViewerMimetypes: jest.fn(() => []),
}));
jest.mock('kolibri/urls');

jest.mock('../tex', () => ({
  __esModule: true,
  then(resolve, reject) {
    mockImportAttempt();
    if (mockFailedImport) {
      return mockFailedImport.then(resolve, reject);
    }
    return mockTexReady.then(() => resolve(jest.requireActual('../tex')), reject);
  },
}));

describe('SafeMarkdown TeX loading', () => {
  beforeEach(() => {
    mockImportAttempt.mockClear();
    mockTexReady = new Promise(resolve => {
      mockResolveTex = resolve;
    });
  });
  it('ignores a TeX import rejection after the text changes', async () => {
    let rejectImport;
    mockFailedImport = new Promise((resolve, reject) => {
      rejectImport = reject;
    });
    const originalErrorHandler = Vue.config.errorHandler;
    const errorHandler = jest.fn();
    try {
      const { updateProps } = render(SafeMarkdown, { props: { text: '$x$' } });
      Vue.config.errorHandler = errorHandler;
      await updateProps({ text: 'Latest' });
      expect(mockImportAttempt).toHaveBeenCalledTimes(1);
      rejectImport(new Error('TeX unavailable'));
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(errorHandler).not.toHaveBeenCalled();
    } finally {
      mockFailedImport = undefined;
      Vue.config.errorHandler = originalErrorHandler;
    }
  });

  it('reports a TeX import rejection for the current text and keeps the formula source', async () => {
    const importError = new Error('TeX unavailable');
    mockFailedImport = Promise.reject(importError);
    const originalErrorHandler = Vue.config.errorHandler;
    const errorHandler = jest.fn();
    try {
      const { container } = render(SafeMarkdown, { props: { text: 'Area $x^2$' } });
      Vue.config.errorHandler = errorHandler;
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(errorHandler).toHaveBeenCalledTimes(1);
      expect(errorHandler.mock.calls[0][0]).toBe(importError);
      expect(container).toHaveTextContent('Area x^2');
    } finally {
      mockFailedImport = undefined;
      Vue.config.errorHandler = originalErrorHandler;
    }
  });

  it.each([
    ['$$$$', '$$$$'],
    ['\\[\\]', '[]'],
    ['$$\n \n$$', '$$$$'],
    ['$$\n\u00a0\n$$', '$$ $$'],
  ])('does not load TeX for %s', async (text, expected) => {
    const { container } = render(SafeMarkdown, { props: { text } });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(mockImportAttempt).not.toHaveBeenCalled();
    expect(container).toHaveTextContent(expected);
  });

  it('loads TeX when a formula appears and keeps the latest text', async () => {
    const probe = jest
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockReturnValue({ width: 77, height: 23 });
    try {
      const { container, updateProps } = render(SafeMarkdown, { props: { text: 'Plain' } });
      expect(container).toHaveTextContent('Plain');

      await updateProps({ text: '$x$' });
      expect(container).toHaveTextContent('x');
      await updateProps({ text: 'Latest' });
      render(SafeMarkdown, { props: { text: 'Read $y$ then [continue](/next)' } });
      const link = screen.getByRole('link');
      link.focus();
      mockResolveTex();
      const math = await screen.findByRole('math', { hidden: true });
      expect(math).toHaveTextContent('y');
      expect(link).toHaveFocus();
      expect(container).toHaveTextContent('Latest');
      expect(container.querySelector('math')).toBeNull();
    } finally {
      probe.mockRestore();
    }
  });
});
