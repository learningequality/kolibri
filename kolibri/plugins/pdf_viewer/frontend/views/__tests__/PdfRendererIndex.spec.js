import { render, screen, fireEvent } from '@testing-library/vue';
import PdfRendererIndex from '../PdfRendererIndex';
import * as mockPDFJS from '../__mocks__/pdfjsMock';

jest.mock('kolibri/urls');
jest.mock('pdfjs-dist/legacy/build/pdf', () => require('../__mocks__/pdfjsMock'));
jest.mock('lodash/debounce', () => fn => fn);
jest.mock('lodash/throttle', () => fn => fn);

const DUMMY_PDF_URL = 'http://localhost:8000/test.pdf';

let vm = null;

function makeWrapper(options = {}) {
  return render(PdfRendererIndex, {
    ...options,
    data: () => ({
      defaultFile: { storage_url: DUMMY_PDF_URL },
      forceDurationBasedProgress: null,
      ...(options.data ? options.data() : {}),
    }),
    mixins: [
      {
        created() {
          if (typeof this.handleUpdate === 'function' && typeof this.zoomIn === 'function') {
            vm = this;
          }
        },
      },
    ],
    stubs: {
      KIconButton: {
        props: ['ariaLabel'],
        template:
          '<button class="k-icon-button" :aria-label="ariaLabel" @click="$emit(\'click\')"></button>',
      },
      RecycleList: {
        template: `
          <div data-testid="recycle-scroller">
            <slot name="item" :item="{}" :index="0"></slot>
          </div>
        `,
        methods: { updateVisibleItems: jest.fn() },
      },
      ...(options.stubs || {}),
    },
  });
}

async function loadPdfContainer(options) {
  const wrapper = makeWrapper(options);
  mockPDFJS.loadingDocument.onProgress({ loaded: 10, total: 10 });
  await global.flushPromises();
  return wrapper;
}

describe('PdfRendererIndex', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateProgress method', () => {
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

    it('should calculate progress using "pages visited/total" by default', () => {
      PdfRendererIndex.methods.updateProgress.call(context);

      expect(context.$emit).toHaveBeenCalledWith('updateProgress', 3 / 9);
      expect(context.$emit).not.toHaveBeenCalledWith(
        'updateProgress',
        context.durationBasedProgress,
      );
    });

    it('should use time-based tracking when forceDurationBasedProgress is true', () => {
      context.forceDurationBasedProgress = true;
      PdfRendererIndex.methods.updateProgress.call(context);

      expect(context.$emit).toHaveBeenCalledWith('updateProgress', 0.1);
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
      expect(mockPDFJS.getDocument).toHaveBeenCalledWith(
        expect.objectContaining({ url: DUMMY_PDF_URL }),
      );
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
            extraFields: { contentState: { savedLocation } },
          },
        });
        expect(mockPDFJS.PdfDocument.getPage).toHaveBeenCalledWith(3);
      });
    });
  });

  describe('Pdf Pages loading on user scroll', () => {
    it('should load required pages strictly within the index range bounds', async () => {
      await loadPdfContainer();

      mockPDFJS.PdfDocument.getPage.mockClear();

      const startIndex = 1;
      const endIndex = 3;
      vm.handleUpdate(startIndex, endIndex);
      await global.flushPromises();

      // Full VTL rendering(unlike shallowMount) naturally loads 3 visible pages
      // plus 4 buffer pages = 7 total pages.
      const EXPECTED_PAGE_LOADS = 7;
      expect(mockPDFJS.PdfDocument.getPage).toHaveBeenCalledTimes(EXPECTED_PAGE_LOADS);

      for (let i = startIndex; i <= endIndex; i++) {
        expect(mockPDFJS.PdfDocument.getPage).toHaveBeenCalledWith(i + 1);
      }
    });

    it('should cache loaded pages and not fetch them again', async () => {
      mockPDFJS.PdfDocument.numPages = 5;
      await loadPdfContainer();

      const startIndex = 2;
      const endIndex = 3;
      vm.handleUpdate(startIndex, endIndex);
      await global.flushPromises();

      const expectedLoadedPages = [true, false, true, true, false];

      vm.pdfPages.forEach((page, index) => {
        expect(page.resolved).toBe(expectedLoadedPages[index]);
        if (page.resolved) {
          expect(page.page).not.toBeNull();
        }
      });
    });

    it('should not load pages that are already loaded', async () => {
      await loadPdfContainer();

      vm.handleUpdate(0, 0);
      await global.flushPromises();

      mockPDFJS.PdfDocument.getPage.mockClear();

      vm.handleUpdate(0, 0);
      await global.flushPromises();

      expect(mockPDFJS.PdfDocument.getPage).not.toHaveBeenCalled();
    });
  });

  describe('Stored visited pages', () => {
    it('Should set the first page as visited on mount', async () => {
      await loadPdfContainer();
      vm.handleUpdate(0, 0);
      await global.flushPromises();

      expect(vm.savedVisitedPages[1]).toBe(true);
    });

    it('Should set the proper page visited when user scrolls', async () => {
      mockPDFJS.PdfDocument.numPages = 10;
      await loadPdfContainer();

      vm.calculatePosition = () => 0.15;
      vm.handleUpdate(1, 2);
      await global.flushPromises();

      expect(vm.savedVisitedPages[2]).toBe(true);
    });
  });

  describe('Pdf controls (Zoom UI Event Wiring)', () => {
    it('should show the pdf controls on mount', async () => {
      const wrapper = await loadPdfContainer();
      expect(wrapper.container.querySelector('.pdf-controls-container')).toBeInTheDocument();
    });

    it('triggers the zoomIn method when the user clicks on the zoom in button', async () => {
      const zoomInSpy = jest.spyOn(PdfRendererIndex.methods, 'zoomIn').mockImplementation(() => {});

      await loadPdfContainer();

      const zoomInBtn = screen.getByRole('button', { name: /Zoom in/i });
      await fireEvent.click(zoomInBtn);

      expect(zoomInSpy).toHaveBeenCalled();
      zoomInSpy.mockRestore();
    });

    it('triggers the zoomOut method when the user clicks on the zoom out button', async () => {
      const zoomOutSpy = jest
        .spyOn(PdfRendererIndex.methods, 'zoomOut')
        .mockImplementation(() => {});

      await loadPdfContainer();

      const zoomOutBtn = screen.getByRole('button', { name: /Zoom out/i });
      await fireEvent.click(zoomOutBtn);

      expect(zoomOutSpy).toHaveBeenCalled();
      zoomOutSpy.mockRestore();
    });
  });
});
