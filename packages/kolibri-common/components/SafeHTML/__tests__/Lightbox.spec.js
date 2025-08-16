import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import Lightbox from '../Lightbox.vue';

const sampleOpen = true;
const sampleSrc = 'test_img.jpg';
const sampleAlt = 'Test img alt text';
const sampleStyleOverrides = { windowSizeClass: ' small-window' };

const renderComponent = () => {
  return render(Lightbox, {
    props: {
      open: sampleOpen,
      src: sampleSrc,
      alt: sampleAlt,
      styleOverrides: sampleStyleOverrides,
    },
  });
};

describe('Lightbox', () => {
  describe('first render', () => {
    test('smoke test', () => {
      renderComponent();
      expect(screen.getByTestId('lightbox-dialog')).toBeInTheDocument();
    });

    test('renders all the buttons', () => {
      renderComponent();
      expect(screen.getByLabelText('Zoom out')).toBeInTheDocument();
      expect(screen.getByLabelText('Zoom in')).toBeInTheDocument();
      expect(screen.getByLabelText('Close')).toBeInTheDocument();
    });

    test('renders the image', () => {
      renderComponent();
      expect(screen.getByAltText(sampleAlt)).toBeInTheDocument();
    });

    test("the 'Zoom out' icon button is initially disabled", () => {
      renderComponent();
      expect(screen.getByLabelText('Zoom out')).toBeDisabled();
    });
  });

  describe('closing the Lightbox', () => {
    test("emits the 'closeLightbox' event when the 'Close' button is clicked by a mouse", async () => {
      const user = userEvent.setup();
      const { emitted } = renderComponent();
      await user.click(screen.getByLabelText('Close'));
      expect(emitted()).toHaveProperty('closeLightbox');
      expect(emitted().closeLightbox).toHaveLength(1);
    });

    test("emits the 'closeLightbox' event when the 'Close' button is clicked by a keyboard", async () => {
      const user = userEvent.setup();
      const { emitted } = renderComponent();
      screen.getByLabelText('Close').focus();
      await user.keyboard('{enter}');
      expect(emitted()).toHaveProperty('closeLightbox');
      expect(emitted().closeLightbox).toHaveLength(1);
      await user.keyboard(' ');
      expect(emitted().closeLightbox).toHaveLength(2);
    });

    test("emits the 'closeLightbox' event when triggering the native dialog.close() method", async () => {
      const { emitted } = renderComponent();
      await screen.getByTestId('lightbox-dialog').dispatchEvent(new Event('close'));
      expect(emitted()).toHaveProperty('closeLightbox');
      expect(emitted().closeLightbox).toHaveLength(1);
    });
  });
});
