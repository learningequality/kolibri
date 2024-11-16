import { shallowMount } from '@vue/test-utils';
import PdfRendererIndex from '../src/views/PdfRendererIndex';
import * as mockPDFJS from './mocks/pdfjsMock';

const { methods } = PdfRendererIndex;

jest.mock('kolibri/urls');

jest.mock('pdfjs-dist/legacy/build/pdf', () => require('./mocks/pdfjsMock'));

jest.mock('lodash/debounce', () => fn => fn);

jest.mock('lodash/throttle', () => fn => fn);

const DUMMY_PDF_URL = 'http://localhost:8000/test.pdf';

function makeWrapper(options = {}) {
  return shallowMount(PdfRendererIndex, {
    ...options,
    data: () => ({
      defaultFile: { storage_url: DUMMY_PDF_URL },
      forceDurationBasedProgress: null,
      $emit: jest.fn(),
      ...options.data,
    }),
  });
}

async function loadPdfContainer(options) {
  const wrapper = makeWrapper(options);
  mockPDFJS.loadingDocument.onProgress({ loaded: 10, total: 10 });
  await global.flushPromises();

  wrapper.vm.handleUpdate(); // First recyle list update call on mount
  await global.flushPromises();
  return wrapper;
}

describe('PdfRendererIndex', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('updateProgress', () => {
    let context = {};

    beforeEach(() => {
      context = {
        forceDurationBasedProgress: null,
        $emit: jest.fn(),
        durationBasedProgress: 0.1,
        savedVisitedPages: { 1: 'true', 2: 'true', 3: 'true' },
        totalPages: 9,
      };
    });

    it('should be able to calculate progress using "pages visited/total" by default', () => {
      methods.updateProgress.call(context);

      expect(context.$emit.mock.calls[0][0]).toBe('updateProgress');
      expect(context.$emit.mock.calls[0][1]).toEqual(
        Object.keys(context.savedVisitedPages).length / context.totalPages,
      );
      expect(context.$emit.mock.calls[0][1]).not.toBe(context.durationBasedProgress);
    });

    it('should have option of using time-based tracking for progress calculation when forceDurationBasedProgress is true', () => {
      context.forceDurationBasedProgress = true;
      methods.updateProgress.call(context);

      expect(context.$emit.mock.calls[0][0]).toBe('updateProgress');
      expect(context.$emit.mock.calls[0][1]).toBe(0.1);
      expect(context.$emit.mock.calls[0][1]).not.toEqual(
        Object.keys(context.savedVisitedPages).length / context.totalPages,
      );
    });
  });

  describe('First render', () => {
    it('smoke test', () => {
      const wrapper = makeWrapper();
      expect(wrapper.exists()).toBe(true);
    });

    it('should get the pdf Document', () => {
      makeWrapper({
        data: { defaultFile: { storage_url: DUMMY_PDF_URL } },
      });
      expect(mockPDFJS.getDocument.mock.calls[0][0].url).toEqual(DUMMY_PDF_URL);
    });

    it('should get the pdf Document Outline', async () => {
      const wrapper = await loadPdfContainer();
      expect(wrapper.vm.outline).toBeDefined();
    });

    describe('Document loading progress', () => {
      it('should update the loading progress when pdf Document is loading', () => {
        const wrapper = makeWrapper();
        expect(mockPDFJS.loadingDocument.onProgress).toBeDefined();
        mockPDFJS.loadingDocument.onProgress({ loaded: 1, total: 10 });
        expect(wrapper.vm.progress).toBe(0.1);
      });

      it('should show Loading component while pdf Document is loading', () => {
        const wrapper = makeWrapper();
        expect(wrapper.find('.progress-bar').exists()).toBe(true);
        mockPDFJS.loadingDocument.onProgress({ loaded: 1, total: 10 });
        expect(wrapper.find('.progress-bar').exists()).toBe(true);
        expect(wrapper.find('.pdf-container').exists()).toBe(false);
      });

      it('should hide Loading component when pdf Document is loaded', async () => {
        const wrapper = await loadPdfContainer();
        expect(wrapper.find('.progress-bar').exists()).toBe(false);
        expect(wrapper.find('.pdf-container').exists()).toBe(true);
      });
    });

    describe('Pdf Pages loading', () => {
      it('should load first the page one if there is the first time opening the pdf and there is no saved Location', async () => {
        await loadPdfContainer();
        expect(mockPDFJS.PdfDocument.getPage).toHaveBeenCalledWith(1);
      });

      it('should load the proper page when there is a saved location', async () => {
        const savedLocation = 0.2;
        mockPDFJS.PdfDocument.numPages = 10;
        await loadPdfContainer({
          data: {
            extraFields: {
              contentState: { savedLocation },
            },
          },
        });
        // 0.2 * 10 = 2 Means that the user already passed the second page so the user
        // will be on the third page
        expect(mockPDFJS.PdfDocument.getPage).toHaveBeenCalledWith(3);
      });
    });
  });

  describe('Pdf Pages loading on user scroll', () => {
    it('should load required pages on user scroll', async () => {
      const wrapper = await loadPdfContainer();

      // Avoid first render reset
      mockPDFJS.PdfDocument.getPage.mockClear();

      // User has scrolled and can see from the second to the four page so
      // that many pages should be loaded
      const startIndex = 1;
      const endIndex = 3;
      wrapper.vm.handleUpdate(startIndex, endIndex);
      await global.flushPromises();
      expect(mockPDFJS.PdfDocument.getPage).toHaveBeenCalledTimes(endIndex - startIndex + 1);
      for (let i = startIndex; i <= endIndex; i++) {
        expect(mockPDFJS.PdfDocument.getPage).toHaveBeenCalledWith(i + 1);
      }
    });

    it('should cache the proper loaded pages', async () => {
      mockPDFJS.PdfDocument.numPages = 5;
      const wrapper = await loadPdfContainer();

      // user scrolls
      const startIndex = 2;
      const endIndex = 3;
      wrapper.vm.handleUpdate(startIndex, endIndex);
      await global.flushPromises();

      // First, third and fourth pages are loaded
      const expectedLoadedPages = [true, false, true, true, false];

      wrapper.vm.pdfPages.forEach((page, index) => {
        expect(page.resolved).toBe(expectedLoadedPages[index]);
        if (page.resolved) {
          expect(page.page).not.toBeNull();
        }
      });
    });

    it('should not load pages that are already loaded', async () => {
      const wrapper = await loadPdfContainer();

      // user scrolls a bit through the first page already loaded
      const startIndex = 0;
      const endIndex = 0;
      wrapper.vm.handleUpdate(startIndex, endIndex);
      await global.flushPromises();

      expect(mockPDFJS.PdfDocument.getPage).toHaveBeenCalledTimes(1);
    });
  });

  describe('Stored visited pages', () => {
    it('Should set the first page as visited on mount', async () => {
      const wrapper = makeWrapper();
      await global.flushPromises();
      expect(wrapper.vm.savedVisitedPages[1]).toBe(true);
    });

    it('Should set the proper page visited when user scrolls', async () => {
      mockPDFJS.PdfDocument.numPages = 10;
      const wrapper = await loadPdfContainer();

      wrapper.vm.calculatePosition = () => 0.15;
      wrapper.vm.handleUpdate(1, 2);
      await global.flushPromises();

      // 15% of 10 pages, so the user has visited the second page
      expect(wrapper.vm.savedVisitedPages[2]).toBe(true);
    });
  });

  describe('Pdf controls', () => {
    it('should show the pdf controls on mount', async () => {
      const wrapper = await loadPdfContainer();
      expect(wrapper.find('.pdf-controls-container').exists()).toBe(true);
    });

    it('Should increase the scale when the user clicks on the zoom in button', async () => {
      const mockUpdateVisibleItems = jest.fn();
      const wrapper = await loadPdfContainer({
        stubs: {
          RecycleList: {
            template: '<div />',
            methods: {
              updateVisibleItems: mockUpdateVisibleItems,
            },
          },
        },
      });
      wrapper.vm.scale = 1;
      const initialScale = wrapper.vm.scale;
      wrapper.vm.zoomIn();
      expect(wrapper.vm.scale > initialScale).toBe(true);
    });

    it('Should decrease the scale when the user clicks on the zoom out button', async () => {
      const mockUpdateVisibleItems = jest.fn();
      const wrapper = await loadPdfContainer({
        stubs: {
          RecycleList: {
            template: '<div />',
            methods: {
              updateVisibleItems: mockUpdateVisibleItems,
            },
          },
        },
      });
      wrapper.vm.scale = 1;
      const initialScale = wrapper.vm.scale;
      wrapper.vm.zoomOut();
      expect(wrapper.vm.scale < initialScale).toBe(true);
    });
  });
});
