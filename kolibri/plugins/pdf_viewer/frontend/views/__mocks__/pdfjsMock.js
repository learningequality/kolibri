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
  getAnnotations: jest.fn(() => Promise.resolve([])),
};

export const PdfDocument = {
  numPages: 1,
  getPage: jest.fn(() => Promise.resolve(PdfPage)),
  cleanup: jest.fn(),
  destroy: jest.fn(),
  getOutline: jest.fn(() => Promise.resolve([])),
  getPageIndex: jest.fn(() => Promise.resolve(1)),
  getDestination: jest.fn(() => Promise.resolve([])),
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

export const AnnotationMode = {
  ENABLE_FORMS: 'ENABLE_FORMS',
};

export class PDFWorker {
  constructor() {
    this.promise = Promise.resolve();
  }
}

/* eslint-enable */
