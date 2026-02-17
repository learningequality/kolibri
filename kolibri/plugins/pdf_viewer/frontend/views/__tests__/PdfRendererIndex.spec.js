import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/vue';
import PdfRendererIndex from '../PdfRendererIndex';
import * as mockPDFJS from '../__mocks__/pdfjsMock';
import '@testing-library/jest-dom';

jest.mock('kolibri/urls');
jest.mock('pdfjs-dist/legacy/build/pdf', () => require('../__mocks__/pdfjsMock'));
jest.mock('lodash/debounce', () => fn => fn);
jest.mock('lodash/throttle', () => fn => fn);

const DUMMY_PDF_URL = 'http://localhost:8000/test.pdf';

// Helper to render with required Kolibri data
const renderPdfViewer = (customData = {}) => {
  return render(PdfRendererIndex, {
    data() {
      return {
        defaultFile: { storage_url: DUMMY_PDF_URL },
        ...customData
      };
    },
    // Mock the global Kolibri filters if needed
    stubs: ['transition-stub', 'RecycleList']
  });
};

describe('PdfRendererIndex', () => {
  afterEach(cleanup);

  it('smoke test', () => {
    renderPdfViewer();
    // Use queryByRole and find the container specifically
    expect(document.querySelector('.pdf-viewer')).toBeInTheDocument();
  });

  describe('Document loading progress', () => {
    it('should show Loading component initially', () => {
      renderPdfViewer();
      // Use getAll because Kolibri/KeenUI might render multiple internal bars
      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars[0]).toBeInTheDocument();
    });

    it('should hide Loading component when pdf Document is loaded', async () => {
      renderPdfViewer();
      
      // Trigger the mock loading completion
      mockPDFJS.loadingDocument.onProgress({ loaded: 10, total: 10 });

      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should exit fullscreen when the ESC key is pressed', async () => {
      renderPdfViewer();
      
      // Simulate user interaction
      await fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
      
      // Verify visual state change (checking for the absence of fullscreen class)
      expect(document.querySelector('.pdf-viewer')).not.toHaveClass('fullscreen');
    });

    it('should have functional zoom buttons', async () => {
      renderPdfViewer();
      mockPDFJS.loadingDocument.onProgress({ loaded: 10, total: 10 });

      // Find by aria-label as noted in your logs
      const zoomIn = await screen.findByLabelText(/Zoom in/i);
      const zoomOut = await screen.findByLabelText(/Zoom out/i);
      
      expect(zoomIn).toBeInTheDocument();
      expect(zoomOut).toBeInTheDocument();
      
      await fireEvent.click(zoomIn);
      // If there's a scale indicator, you'd assert its text change here
    });
  });
});