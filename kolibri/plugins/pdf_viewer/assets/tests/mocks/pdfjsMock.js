/* eslint-disable no-undef */

export const GlobalWorkerOptions = {
  workerSrc: '',
};

export const PdfPage = {
  view: [0, 0, 595.276, 841.89],
  getViewport: jest.fn(() => ({})),
  render: jest.fn(() => ({
    promise: Promise.resolve(),
    cancel: jest.fn(),
  })),
  streamTextContent: jest.fn(() => ({})),
};

export const PdfDocument = {
  numPages: 1,
  getPage: jest.fn(() => Promise.resolve(PdfPage)),
  cleanup: jest.fn(),
  destroy: jest.fn(),
};

export const loadingDocument = {
  onProgress: null,
  promise: Promise.resolve(PdfDocument),
};

export const getDocument = jest.fn(() => loadingDocument);

export const renderTextLayer = jest.fn(() => ({
  promise: Promise.resolve(),
  expandTextDivs: jest.fn(),
  cancel: jest.fn(),
}));

/* eslint-enable */
