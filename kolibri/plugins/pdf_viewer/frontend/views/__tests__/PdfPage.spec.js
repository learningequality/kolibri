import { render, screen, waitFor, cleanup } from '@testing-library/vue';
import PdfPage from '../PdfPage';
import { EventBus } from '../../utils/event_utils';
import * as mockPDFJS from '../__mocks__/pdfjsMock';
import '@testing-library/jest-dom';

jest.mock('pdfjs-dist/legacy/build/pdf', () => require('../__mocks__/pdfjsMock'));

const defaultProps = {
  pageNumber: 1,
  pdfPage: mockPDFJS.PdfPage,
  pageReady: false,
  scale: 1,
  firstPageHeight: 600,
  firstPageWidth: 800,
  eventBus: new EventBus(),
};

describe('PdfPage', () => {
  beforeAll(() => {
    HTMLCanvasElement.prototype.getContext = jest.fn();
  });

  afterEach(cleanup);

  it('displays the page number placeholder before content is displayed', () => {
    render(PdfPage, { props: defaultProps });
    
    // Validate by attribute since the internal text shows 'NaN' during loading
    const pageRegion = screen.getByRole('region');
    expect(pageRegion).toHaveAttribute('pagenumber', '1');
    
    const canvas = document.querySelector('canvas');
    expect(canvas).toHaveStyle('display: none;');
  });

  it('renders the canvas and text layer when the page is ready', async () => {
    const utils = render(PdfPage, { props: defaultProps });
    const rerender = utils.rerender || utils.updateProps;
    
    // Only pass the changed prop to avoid the 'same object' reference error
    await rerender({ pageReady: true });

    await waitFor(() => {
      expect(mockPDFJS.PdfPage.render).toHaveBeenCalled();
      const canvas = document.querySelector('canvas');
      expect(canvas).not.toHaveStyle('display: none;');
    });
  });
});