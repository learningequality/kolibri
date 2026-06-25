import { fireEvent, render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import Lightbox from '../Lightbox.vue';

const { zoomOut$, zoomIn$, closeAction$ } = coreStrings;

const sampleOpen = true;
const sampleSrc = 'test_img.jpg';
const sampleAlt = 'Test img alt text';

const renderComponent = () => {
  return render(Lightbox, {
    props: {
      open: sampleOpen,
      src: sampleSrc,
      alt: sampleAlt,
    },
  });
};

function mockNaturalDimensions(img, width = 800, height = 600) {
  Object.defineProperty(img, 'naturalWidth', { value: width });
  Object.defineProperty(img, 'naturalHeight', { value: height });
}

async function clickBtnNTimes(user, btn, times) {
  for (let i = 0; i < times; i++) {
    await user.click(btn);
  }
}

describe('Lightbox', () => {
  let user, lightboxDialog, img, zoomOut, zoomIn, close, emitted;
  beforeEach(async () => {
    user = userEvent.setup();
    const result = renderComponent();
    emitted = result.emitted;

    lightboxDialog = screen.getByTestId('lightbox-dialog');
    img = screen.getByAltText(sampleAlt);
    zoomOut = screen.getByLabelText(zoomOut$());
    zoomIn = screen.getByLabelText(zoomIn$());
    close = screen.getByLabelText(closeAction$());

    mockNaturalDimensions(img);
    img.dispatchEvent(new Event('load')); // Trigger load event so calculateSize is called
  });

  describe('first render', () => {
    it('smoke test', () => {
      expect(lightboxDialog).toBeInTheDocument();
    });

    it('renders all the buttons', () => {
      expect(zoomOut).toBeInTheDocument();
      expect(zoomIn).toBeInTheDocument();
      expect(close).toBeInTheDocument();
    });

    it('renders the image', () => {
      expect(img).toBeInTheDocument();
    });

    it("the 'Zoom out' icon button is initially disabled", () => {
      expect(zoomOut).toBeDisabled();
    });
  });

  describe('zooming out on the image', () => {
    it("decreases the scale when the 'Zoom out' button is clicked by a mouse", async () => {
      // Zoom in first so we can zoom out later
      await user.click(zoomIn);
      const prevWidth = parseInt(img.style.width);
      const prevHeight = parseInt(img.style.height);

      await user.click(zoomOut);
      expect(parseInt(img.style.width)).toBeLessThan(prevWidth);
      expect(parseInt(img.style.height)).toBeLessThan(prevHeight);
    });

    it("decreases the scale when the 'Zoom out' button is clicked by a keyboard", async () => {
      await clickBtnNTimes(user, zoomIn, 2);
      let prevWidth = parseInt(img.style.width);
      let prevHeight = parseInt(img.style.height);

      zoomOut.focus();
      await user.keyboard('{enter}');
      expect(parseInt(img.style.width)).toBeLessThan(prevWidth);
      expect(parseInt(img.style.height)).toBeLessThan(prevHeight);
      prevWidth = parseInt(img.style.width);
      prevHeight = parseInt(img.style.height);

      await user.keyboard(' ');
      expect(parseInt(img.style.width)).toBeLessThan(prevWidth);
      expect(parseInt(img.style.height)).toBeLessThan(prevHeight);
    });

    it('decreases the scale when scrolling the mouse wheel down on the image', async () => {
      await user.click(zoomIn);
      const prevWidth = parseInt(img.style.width);
      const prevHeight = parseInt(img.style.height);

      // Simulate wheel scroll down (zoom out)
      await fireEvent.wheel(img, { deltaY: 100 });

      expect(parseInt(img.style.width)).toBeLessThan(prevWidth);
      expect(parseInt(img.style.height)).toBeLessThan(prevHeight);
    });
  });

  describe('zooming in on the image', () => {
    it("increases the scale when the 'Zoom in' button is clicked by a mouse", async () => {
      const prevWidth = parseInt(img.style.width);
      const prevHeight = parseInt(img.style.height);

      await user.click(zoomIn);
      expect(parseInt(img.style.width)).toBeGreaterThan(prevWidth);
      expect(parseInt(img.style.height)).toBeGreaterThan(prevHeight);
    });

    it("increases the scale when the 'Zoom in' button is clicked by a keyboard", async () => {
      let prevWidth = parseInt(img.style.width);
      let prevHeight = parseInt(img.style.height);

      zoomIn.focus();
      await user.keyboard('{enter}');
      expect(parseInt(img.style.width)).toBeGreaterThan(prevWidth);
      expect(parseInt(img.style.height)).toBeGreaterThan(prevHeight);
      prevWidth = parseInt(img.style.width);
      prevHeight = parseInt(img.style.height);

      await user.keyboard(' ');
      expect(parseInt(img.style.width)).toBeGreaterThan(prevWidth);
      expect(parseInt(img.style.height)).toBeGreaterThan(prevHeight);
    });

    it('increases the scale when scrolling the mouse wheel up on the image', async () => {
      const prevWidth = parseInt(img.style.width);
      const prevHeight = parseInt(img.style.height);

      // Simulate wheel scroll up (zoom in)
      await fireEvent.wheel(img, { deltaY: -100 });

      expect(parseInt(img.style.width)).toBeGreaterThan(prevWidth);
      expect(parseInt(img.style.height)).toBeGreaterThan(prevHeight);
    });

    it("disables the 'Zoom in' button after it's clicked for 12 times", async () => {
      await clickBtnNTimes(user, zoomIn, 12);
      expect(zoomIn).toBeDisabled();
    });
  });

  describe('panning the image', () => {
    it("moves the image when it's dragged by a mouse", async () => {
      await clickBtnNTimes(user, zoomIn, 12); // Zoom image to maximum scale

      const prevTransform = img.style.transform;
      await fireEvent.mouseDown(img, { clientX: 100, clientY: 100 });
      await fireEvent.mouseMove(window, { clientX: 200, clientY: 200 });
      await fireEvent.mouseUp(window, { clientX: 200, clientY: 200 });
      expect(img.style.transform).not.toEqual(prevTransform);
    });

    it('moves the image when an arrow key on a keyboard is pressed', async () => {
      await clickBtnNTimes(user, zoomIn, 12);

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
    it("emits the 'closeLightbox' event when the 'Close' button is clicked by a mouse", async () => {
      await user.click(close);
      expect(emitted()).toHaveProperty('closeLightbox');
      expect(emitted().closeLightbox).toHaveLength(1);
    });

    it("emits the 'closeLightbox' event when the 'Close' button is clicked by a keyboard", async () => {
      close.focus();
      await user.keyboard('{enter}');
      expect(emitted()).toHaveProperty('closeLightbox');
      expect(emitted().closeLightbox).toHaveLength(1);
      await user.keyboard(' ');
      expect(emitted().closeLightbox).toHaveLength(2);
    });

    it("emits the 'closeLightbox' event when triggering the native dialog.close() method", async () => {
      await lightboxDialog.dispatchEvent(new Event('close'));
      expect(emitted()).toHaveProperty('closeLightbox');
      expect(emitted().closeLightbox).toHaveLength(1);
    });
  });
});
