import { render } from '@testing-library/vue';
import * as mockPDFJS from '../__mocks__/pdfjsMock';
import PdfPage from '../PdfPage';
import { EventBus } from '../../utils/event_utils';

jest.mock('pdfjs-dist/legacy/build/pdf', () => mockPDFJS);

function makeWrapper(options = {}) {
  return render(PdfPage, {
    ...options,
    props: {
      pageNumber: 1,
      pdfPage: mockPDFJS.PdfPage,
      pageReady: false,
      scale: 1,
      firstPageHeight: 600,
      firstPageWidth: 800,
      ...(options.propsData || options.props),
      eventBus: new EventBus(),
    },
  });
}

describe('PdfPage', () => {
  beforeAll(() => {
    HTMLCanvasElement.prototype.getContext = () => {};
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    HTMLCanvasElement.prototype.getContext = undefined;
  });

  it('smoke test', () => {
    const wrapper = makeWrapper();
    expect(wrapper.container).toBeTruthy();
  });

  describe('canvas pdf page', () => {
    it('Should render the page if the page is loaded', async () => {
      const pdfPage = mockPDFJS.PdfPage;
      makeWrapper({
        props: {
          pdfPage,
          pageReady: true,
        },
      });
      await global.flushPromises();
      expect(pdfPage.render).toHaveBeenCalled();
    });

    it('Should not render the page if the page is not loaded', async () => {
      const pdfPage = mockPDFJS.PdfPage;
      makeWrapper({
        props: {
          pdfPage,
          pageReady: false,
        },
      });
      await global.flushPromises();
      expect(pdfPage.render).not.toHaveBeenCalled();
    });

    it('Should render the page after the page is loaded', async () => {
      const pdfPage = mockPDFJS.PdfPage;
      const wrapper = makeWrapper({
        props: {
          pdfPage,
          pageReady: false,
        },
      });
      await global.flushPromises();
      await wrapper.updateProps({ pageReady: true });
      await global.flushPromises();
      expect(pdfPage.render).toHaveBeenCalled();
    });

    it('Should show the canvas just after page rendering is complete', async () => {
      const pdfPage = mockPDFJS.PdfPage;
      const wrapper = makeWrapper({
        props: {
          pdfPage,
          pageReady: false,
        },
      });
      await global.flushPromises();

      const canvas = wrapper.container.querySelector('canvas');
      expect(canvas).toHaveStyle({ display: 'none' });

      await wrapper.updateProps({ pageReady: true });
      await global.flushPromises();
      expect(canvas).not.toHaveStyle({ display: 'none' });
    });
  });

  describe('Text layer', () => {
    it('Should render the text layer if the page is loaded', async () => {
      const pdfPage = mockPDFJS.PdfPage;
      makeWrapper({
        props: {
          pdfPage,
          pageReady: true,
        },
      });
      await global.flushPromises();
      expect(mockPDFJS.renderTextLayer).toHaveBeenCalled();
    });

    it('Should not render the text layer if the page is not loaded', async () => {
      const pdfPage = mockPDFJS.PdfPage;
      makeWrapper({
        props: {
          pdfPage,
          pageReady: false,
        },
      });
      await global.flushPromises();
      expect(mockPDFJS.renderTextLayer).not.toHaveBeenCalled();
    });
  });
});
