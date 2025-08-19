import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import SafeHtmlImage from '../SafeHtmlImage.vue';

const sampleSrc = 'test_img.jpg';
const sampleAlt = 'Test img alt text';
const sampleStyleOverrides = { windowSizeClass: '' };

const renderComponent = () => {
  return render(SafeHtmlImage, {
    props: {
      src: sampleSrc,
      alt: sampleAlt,
      styleOverrides: sampleStyleOverrides,
    },
  });
};

beforeEach(() => {
  if (!window.HTMLDialogElement.prototype.showModal) {
    window.HTMLDialogElement.prototype.showModal = jest.fn();
  }
  if (!window.HTMLDialogElement.prototype.close) {
    window.HTMLDialogElement.prototype.close = jest.fn();
  }
});

describe('SafeHtmlImage', () => {
  describe('first render', () => {
    test('smoke test', () => {
      renderComponent();
      expect(screen.getByTestId('image-container')).toBeInTheDocument();
    });

    test('renders the image', () => {
      renderComponent();
      expect(screen.getByAltText(sampleAlt)).toBeInTheDocument();
    });

    test("renders the 'Expand' button", () => {
      renderComponent();
      const expandButton = screen.getByLabelText('Expand image');
      expect(expandButton).toBeInTheDocument();
    });

    test('the Lightbox dialog is not present initially', () => {
      renderComponent();
      expect(screen.queryByTestId('lightbox-dialog')).not.toBeInTheDocument();
    });
  });

  describe('expanding the image', () => {
    test('opens the Lightbox if the image is clicked by a mouse', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByAltText(sampleAlt));
      expect(screen.getByTestId('lightbox-dialog')).toBeInTheDocument();
    });

    test("opens the Lightbox if the 'Expand' button is clicked by a mouse", async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByLabelText('Expand image'));
      expect(screen.getByTestId('lightbox-dialog')).toBeInTheDocument();
    });

    test("opens the Lightbox if the 'Expand' button is clicked by a keyboard", async () => {
      const user = userEvent.setup();
      renderComponent();

      screen.getByLabelText('Expand image').focus();
      await user.keyboard('{enter}');
      expect(screen.getByTestId('lightbox-dialog')).toBeInTheDocument();

      await user.click(screen.getByLabelText('Close'));
      expect(screen.queryByTestId('lightbox-dialog')).not.toBeInTheDocument();

      screen.getByLabelText('Expand image').focus();
      await user.keyboard(' ');
      expect(screen.getByTestId('lightbox-dialog')).toBeInTheDocument();
    });
  });

  test("closes the Lightbox when the 'Close' button is clicked", async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByLabelText('Expand image')); // Open Lightbox first
    expect(screen.getByTestId('lightbox-dialog')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Close'));
    expect(screen.queryByTestId('lightbox-dialog')).not.toBeInTheDocument();
  });
});
