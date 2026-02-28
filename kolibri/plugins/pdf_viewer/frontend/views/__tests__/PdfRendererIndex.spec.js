import { render, fireEvent } from '@testing-library/vue';
import PdfRendererIndex from '../PdfRendererIndex';
import * as mockPDFJS from '../__mocks__/pdfjsMock';

const { methods } = PdfRendererIndex;

jest.mock('kolibri/urls');

jest.mock('pdfjs-dist/legacy/build/pdf', () => require('../__mocks__/pdfjsMock'));

jest.mock('lodash/debounce', () => fn => fn);

jest.mock('lodash/throttle', () => fn => fn);

const DUMMY_PDF_URL = 'http://localhost:8000/test.pdf';

function makeWrapper(options = {}) {
  const utils = render(PdfRendererIndex, {
    ...options,
    data: () => ({
      defaultFile: { storage_url: DUMMY_PDF_URL },
      forceDurationBasedProgress: null,
      ...(options.data ? options.data() : {}),
    }),
    stubs: {
      KIconButton: {
        template: '<button class="k-icon-button" @click="$emit(\'click\')"></button>',
      },
      ...(options.stubs || {}),
    },
  });

  const rootVm = utils.container.firstElementChild.__vue__;
  const vm =
    rootVm && rootVm.$children && rootVm.$children.length > 0 ? rootVm.$children[0] : rootVm;

  return { ...utils, vm };
}

async function loadPdfContainer(options) {
  const wrapper = makeWrapper(options);
  mockPDFJS.loadingDocument.onProgress({ loaded: 10, total: 10 });
  await global.flushPromises();

  wrapper.vm.handleUpdate();
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
      expect(wrapper.container).toBeTruthy();
    });

    it('should get the pdf Document', () => {
      makeWrapper({
        data: () => ({ defaultFile: { storage_url: DUMMY_PDF_URL } }),
      });
      expect(mockPDFJS.getDocument.mock.calls[0][0].url).toEqual(DUMMY_PDF_URL);
    });

    it('should get the pdf Document Outline', async () => {
      await loadPdfContainer();
      expect(mockPDFJS.PdfDocument.getOutline).toHaveBeenCalled();
    });

    describe('Document loading progress', () => {
      it('should show Loading component while pdf Document is loading', () => {
        const wrapper = makeWrapper();
        expect(wrapper.container.querySelector('.progress-bar')).toBeInTheDocument();

        mockPDFJS.loadingDocument.onProgress({ loaded: 1, total: 10 });

        expect(wrapper.container.querySelector('.progress-bar')).toBeInTheDocument();
        expect(wrapper.container.querySelector('.pdf-container')).not.toBeInTheDocument();
      });

      it('should hide Loading component when pdf Document is loaded', async () => {
        const wrapper = await loadPdfContainer();
        expect(wrapper.container.querySelector('.progress-bar')).not.toBeInTheDocument();
        expect(wrapper.container.querySelector('.pdf-container')).toBeInTheDocument();
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
          props: {
            extraFields: {
              contentState: { savedLocation },
            },
          },
        });
        expect(mockPDFJS.PdfDocument.getPage).toHaveBeenCalledWith(3);
      });
    });
  });

  describe('Pdf Pages loading on user scroll', () => {
    it('should load required pages on user scroll', async () => {
      const wrapper = await loadPdfContainer();

      mockPDFJS.PdfDocument.getPage.mockClear();

      const startIndex = 1;
      const endIndex = 3;
      wrapper.vm.handleUpdate(startIndex, endIndex);
      await global.flushPromises();

      expect(mockPDFJS.PdfDocument.getPage).toHaveBeenCalledTimes(7);

      for (let i = startIndex; i <= endIndex; i++) {
        expect(mockPDFJS.PdfDocument.getPage).toHaveBeenCalledWith(i + 1);
      }
    });

    it('should cache the proper loaded pages', async () => {
      mockPDFJS.PdfDocument.numPages = 5;
      const wrapper = await loadPdfContainer();

      const startIndex = 2;
      const endIndex = 3;
      wrapper.vm.handleUpdate(startIndex, endIndex);
      await global.flushPromises();

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

      expect(wrapper.vm.savedVisitedPages[2]).toBe(true);
    });
  });

  describe('Pdf controls', () => {
    it('should show the pdf controls on mount', async () => {
      const wrapper = await loadPdfContainer();
      expect(wrapper.container.querySelector('.pdf-controls-container')).toBeInTheDocument();
    });

    it('Should increase the scale when the user clicks on the zoom in button', async () => {
      const wrapper = await loadPdfContainer();

      const buttons = wrapper.container.querySelectorAll('button');

      let scaleIncreased = false;

      for (const btn of buttons) {
        wrapper.vm.scale = 1;
        await fireEvent.click(btn);
        await global.flushPromises();
        if (wrapper.vm.scale > 1) {
          scaleIncreased = true;
          break;
        }
      }

      expect(scaleIncreased).toBe(true);
    });

    it('Should decrease the scale when the user clicks on the zoom out button', async () => {
      const wrapper = await loadPdfContainer();

      const buttons = wrapper.container.querySelectorAll('button');

      let scaleDecreased = false;

      for (const btn of buttons) {
        wrapper.vm.scale = 1;
        await fireEvent.click(btn);
        await global.flushPromises();
        if (wrapper.vm.scale < 1) {
          scaleDecreased = true;
          break;
        }
      }

      expect(scaleDecreased).toBe(true);
    });
  });
});
