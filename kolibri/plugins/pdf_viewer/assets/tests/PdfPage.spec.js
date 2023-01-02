import { shallowMount } from '@vue/test-utils';
import PdfPage from '../src/views/PdfPage';
import { EventBus } from '../src/utils/event_utils';
import * as mockPDFJS from './mocks/pdfjsMock';

jest.mock('pdfjs-dist/legacy/build/pdf', () => require('./mocks/pdfjsMock'));

function makeWrapper(options = {}) {
  return shallowMount(PdfPage, {
    ...options,
    propsData: {
      pageNumber: 1,
      pdfPage: mockPDFJS.PdfPage,
      pageReady: false,
      scale: 1,
      firstPageHeight: 600,
      firstPageWidth: 800,
      ...options.propsData,
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
    expect(wrapper.exists()).toBe(true);
  });

  describe('canvas pdf page', () => {
    it('Should render the page if the page is loaded', async () => {
      const pdfPage = mockPDFJS.PdfPage;
      makeWrapper({
        propsData: {
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
        propsData: {
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
        propsData: {
          pdfPage,
          pageReady: false,
        },
      });
      await global.flushPromises();

      wrapper.setProps({ pageReady: true });
      await global.flushPromises();
      expect(pdfPage.render).toHaveBeenCalled();
    });

    it('Should show the canvas just after page rendering is complete', async () => {
      const pdfPage = mockPDFJS.PdfPage;
      const wrapper = makeWrapper({
        propsData: {
          pdfPage,
          pageReady: false,
        },
      });
      await global.flushPromises();
      expect(wrapper.find('canvas').attributes('style')).toBe('display: none;');

      wrapper.setProps({ pageReady: true });
      await global.flushPromises();
      expect(wrapper.find('canvas').attributes('style')).not.toBe('display: none;');
    });
  });

  describe('Text layer', () => {
    it('Should render the text layer if the page is loaded', async () => {
      const pdfPage = mockPDFJS.PdfPage;
      makeWrapper({
        propsData: {
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
        propsData: {
          pdfPage,
          pageReady: false,
        },
      });
      await global.flushPromises();
      expect(mockPDFJS.renderTextLayer).not.toHaveBeenCalled();
    });
  });
});
