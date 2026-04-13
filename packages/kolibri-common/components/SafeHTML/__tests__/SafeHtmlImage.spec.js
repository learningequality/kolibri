import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import SafeHtmlImage from '../SafeHtmlImage.vue';

const sampleSrc = 'test_img.jpg';
const sampleAlt = 'Test img alt text';

const renderComponent = () => {
  return render(SafeHtmlImage, {
    props: {
      src: sampleSrc,
      alt: sampleAlt,
    },
  });
};

describe('SafeHtmlImage', () => {
  beforeAll(() => {
    if (!window.HTMLDialogElement.prototype.showModal) {
      window.HTMLDialogElement.prototype.showModal = jest.fn();
    }
    if (!window.HTMLDialogElement.prototype.close) {
      window.HTMLDialogElement.prototype.close = jest.fn();
    }
  });
  let user, img, expandButton;
  beforeEach(async () => {
    user = userEvent.setup();
    renderComponent();
    img = screen.getByAltText(sampleAlt);
    expandButton = screen.getByLabelText('Expand image');
  });

  describe('first render', () => {
    it('smoke test', () => {
      expect(screen.getByTestId('image-container')).toBeInTheDocument();
    });

    it('renders the image', () => {
      expect(img).toBeInTheDocument();
    });

    it("renders the 'Expand' button", () => {
      expect(expandButton).toBeInTheDocument();
    });

    it('the Lightbox dialog is not present initially', () => {
      expect(screen.queryByTestId('lightbox-dialog')).not.toBeInTheDocument();
    });
  });

  describe('expanding the image', () => {
    it('opens the Lightbox if the image is clicked by a mouse', async () => {
      await user.click(img);
      expect(screen.getByTestId('lightbox-dialog')).toBeInTheDocument();
    });

    it("opens the Lightbox if the 'Expand' button is clicked by a mouse", async () => {
      await user.click(expandButton);
      expect(screen.getByTestId('lightbox-dialog')).toBeInTheDocument();
    });

    it("opens the Lightbox if the 'Expand' button is clicked by a keyboard", async () => {
      expandButton.focus();
      await user.keyboard('{enter}');
      expect(screen.getByTestId('lightbox-dialog')).toBeInTheDocument();

      await user.click(screen.getByLabelText('Close'));
      expect(screen.queryByTestId('lightbox-dialog')).not.toBeInTheDocument();

      expandButton.focus();
      await user.keyboard(' ');
      expect(screen.getByTestId('lightbox-dialog')).toBeInTheDocument();
    });
  });

  it("closes the Lightbox when the 'Close' button is clicked", async () => {
    await user.click(expandButton); // Open Lightbox first
    expect(screen.getByTestId('lightbox-dialog')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Close'));
    expect(screen.queryByTestId('lightbox-dialog')).not.toBeInTheDocument();
  });
});
