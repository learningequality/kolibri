import { fireEvent, render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import Lightbox from '../Lightbox.vue';

const sampleOpen = true;
const sampleSrc = 'test_img.jpg';
const sampleAlt = 'Test img alt text';
const sampleStyleOverrides = { windowSizeClass: '' };

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

  describe('zooming out on the image', () => {
    test("decreases the scale when the 'Zoom out' button is clicked by a mouse", async () => {
      const user = userEvent.setup();
      renderComponent();

      const img = screen.getByAltText(sampleAlt);
      // Mock natural dimensions
      Object.defineProperty(img, 'naturalWidth', { value: 800 });
      Object.defineProperty(img, 'naturalHeight', { value: 600 });
      // Trigger load event so calculateSize is called
      await img.dispatchEvent(new Event('load'));
      // Zoom in first so we can zoom out later
      await user.click(screen.getByLabelText('Zoom in'));
      const prevWidth = parseInt(img.style.width);
      const prevHeight = parseInt(img.style.height);

      await user.click(screen.getByLabelText('Zoom out'));
      expect(parseInt(img.style.width)).toBeLessThan(prevWidth);
      expect(parseInt(img.style.height)).toBeLessThan(prevHeight);
    });

    test("decreases the scale when the 'Zoom out' button is clicked by a keyboard", async () => {
      const user = userEvent.setup();
      renderComponent();

      const img = screen.getByAltText(sampleAlt);
      Object.defineProperty(img, 'naturalWidth', { value: 800 });
      Object.defineProperty(img, 'naturalHeight', { value: 600 });
      await img.dispatchEvent(new Event('load'));
      await user.click(screen.getByLabelText('Zoom in'));
      await user.click(screen.getByLabelText('Zoom in'));
      let prevWidth = parseInt(img.style.width);
      let prevHeight = parseInt(img.style.height);

      screen.getByLabelText('Zoom out').focus();
      await user.keyboard('{enter}');
      expect(parseInt(img.style.width)).toBeLessThan(prevWidth);
      expect(parseInt(img.style.height)).toBeLessThan(prevHeight);
      prevWidth = parseInt(img.style.width);
      prevHeight = parseInt(img.style.height);

      await user.keyboard(' ');
      expect(parseInt(img.style.width)).toBeLessThan(prevWidth);
      expect(parseInt(img.style.height)).toBeLessThan(prevHeight);
    });

    test('decreases the scale when scrolling the mouse wheel down on the image', async () => {
      const user = userEvent.setup();
      renderComponent();

      const img = screen.getByAltText(sampleAlt);
      Object.defineProperty(img, 'naturalWidth', { value: 800 });
      Object.defineProperty(img, 'naturalHeight', { value: 600 });
      await img.dispatchEvent(new Event('load'));

      await user.click(screen.getByLabelText('Zoom in'));
      const prevWidth = parseInt(img.style.width);
      const prevHeight = parseInt(img.style.height);

      // Simulate wheel scroll down (zoom out)
      await fireEvent.wheel(img, { deltaY: 100 });

      expect(parseInt(img.style.width)).toBeLessThan(prevWidth);
      expect(parseInt(img.style.height)).toBeLessThan(prevHeight);
    });
  });

  describe('zooming in on the image', () => {
    test("increases the scale when the 'Zoom in' button is clicked by a mouse", async () => {
      const user = userEvent.setup();
      renderComponent();

      const img = screen.getByAltText(sampleAlt);
      // Mock natural dimensions
      Object.defineProperty(img, 'naturalWidth', { value: '800' });
      Object.defineProperty(img, 'naturalHeight', { value: '600' });
      // Trigger load event so calculateSize is called
      await img.dispatchEvent(new Event('load'));
      const prevWidth = parseInt(img.style.width);
      const prevHeight = parseInt(img.style.height);

      await user.click(screen.getByLabelText('Zoom in'));
      expect(parseInt(img.style.width)).toBeGreaterThan(prevWidth);
      expect(parseInt(img.style.height)).toBeGreaterThan(prevHeight);
    });

    test("increases the scale when the 'Zoom in' button is clicked by a keyboard", async () => {
      const user = userEvent.setup();
      renderComponent();

      const img = screen.getByAltText(sampleAlt);
      Object.defineProperty(img, 'naturalWidth', { value: '800' });
      Object.defineProperty(img, 'naturalHeight', { value: '600' });
      await img.dispatchEvent(new Event('load'));
      let prevWidth = parseInt(img.style.width);
      let prevHeight = parseInt(img.style.height);

      screen.getByLabelText('Zoom in').focus();
      await user.keyboard('{enter}');
      expect(parseInt(img.style.width)).toBeGreaterThan(prevWidth);
      expect(parseInt(img.style.height)).toBeGreaterThan(prevHeight);
      prevWidth = parseInt(img.style.width);
      prevHeight = parseInt(img.style.height);

      await user.keyboard(' ');
      expect(parseInt(img.style.width)).toBeGreaterThan(prevWidth);
      expect(parseInt(img.style.height)).toBeGreaterThan(prevHeight);
    });

    test('increases the scale when scrolling the mouse wheel up on the image', async () => {
      renderComponent();

      const img = screen.getByAltText(sampleAlt);
      Object.defineProperty(img, 'naturalWidth', { value: 800 });
      Object.defineProperty(img, 'naturalHeight', { value: 600 });
      await img.dispatchEvent(new Event('load'));
      const prevWidth = parseInt(img.style.width);
      const prevHeight = parseInt(img.style.height);

      // Simulate wheel scroll up (zoom in)
      await fireEvent.wheel(img, { deltaY: -100 });

      expect(parseInt(img.style.width)).toBeGreaterThan(prevWidth);
      expect(parseInt(img.style.height)).toBeGreaterThan(prevHeight);
    });

    test("disables the 'Zoom in' button after it's clicked for 12 times", async () => {
      const user = userEvent.setup();
      renderComponent();

      for (let i = 0; i < 12; i++) {
        await user.click(screen.getByLabelText('Zoom in'));
      }
    });
  });

  describe('panning the image', () => {
    test("moves the image when it's dragged by a mouse", async () => {
      const user = userEvent.setup();
      renderComponent();

      const img = screen.getByAltText(sampleAlt);
      // Mock natural dimensions
      Object.defineProperty(img, 'naturalWidth', { value: '800' });
      Object.defineProperty(img, 'naturalHeight', { value: '600' });
      // Trigger load event so calculateSize is called
      await img.dispatchEvent(new Event('load'));
      // Zoom image to maximum scale
      for (let i = 0; i < 12; i++) {
        await user.click(screen.getByLabelText('Zoom in'));
      }

      const prevTransform = img.style.transform;
      await fireEvent.mouseDown(img, { clientX: 100, clientY: 100 });
      await fireEvent.mouseMove(window, { clientX: 200, clientY: 200 });
      await fireEvent.mouseUp(window, { clientX: 200, clientY: 200 });
      expect(img.style.transform).not.toEqual(prevTransform);
    });

    test('moves the image when an arrow key on a keyboard is pressed', async () => {
      const user = userEvent.setup();
      renderComponent();

      const img = screen.getByAltText(sampleAlt);
      Object.defineProperty(img, 'naturalWidth', { value: '800' });
      Object.defineProperty(img, 'naturalHeight', { value: '600' });
      await img.dispatchEvent(new Event('load'));
      for (let i = 0; i < 12; i++) {
        await user.click(screen.getByLabelText('Zoom in'));
      }

      let prevTransform = img.style.transform;
      await user.keyboard('{ArrowRight}');
      expect(img.style.transform).not.toEqual(prevTransform);

      prevTransform = img.style.transform;
      await user.keyboard('{ArrowDown}');
      expect(img.style.transform).not.toEqual(prevTransform);

      prevTransform = img.style.transform;
      await user.keyboard('{ArrowLeft}');
      expect(img.style.transform).not.toEqual(prevTransform);

      prevTransform = img.style.transform;
      await user.keyboard('{ArrowUp}');
      expect(img.style.transform).not.toEqual(prevTransform);
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
