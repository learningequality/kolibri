import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTranslator } from 'kolibri/utils/i18n';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import SafeHtmlImage from '../SafeHtmlImage.vue';
import { createSafeHTML } from '../index';

const { closeAction$ } = coreStrings;

const { expandImage$ } = createTranslator(SafeHtmlImage.name, SafeHtmlImage.$trs);

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

// jsdom loads no images, so naturalWidth stays 0 and the element has no layout:
// both sides of the availability check have to be stubbed before `load` fires.
const loadImage = async (image, rendered, natural) => {
  Object.defineProperty(image, 'naturalWidth', { value: natural.width, configurable: true });
  Object.defineProperty(image, 'naturalHeight', { value: natural.height, configurable: true });
  image.getBoundingClientRect = jest.fn(() => rendered);
  await fireEvent.load(image);
};

const stubDialog = () => {
  if (!window.HTMLDialogElement.prototype.showModal) {
    window.HTMLDialogElement.prototype.showModal = jest.fn();
  }
  if (!window.HTMLDialogElement.prototype.close) {
    window.HTMLDialogElement.prototype.close = jest.fn();
  }
};

describe('SafeHtmlImage', () => {
  beforeAll(stubDialog);
  let user, img, expandButton;
  beforeEach(async () => {
    user = userEvent.setup();
    renderComponent();
    img = screen.getByAltText(sampleAlt);
    await loadImage(img, { width: 800, height: 600 }, { width: 1600, height: 1200 });
    expandButton = screen.getByRole('button', { name: expandImage$() });
  });

  describe('first render', () => {
    it('smoke test', () => {
      expect(screen.getByTestId('image-container')).toBeInTheDocument();
    });

    it('renders the image', () => {
      expect(img).toBeInTheDocument();
    });

    it('does not render the image inside a button', () => {
      expect(img.closest('button')).toBeNull();
    });

    it("renders the 'Expand' button", () => {
      expect(expandButton).toBeInTheDocument();
    });

    it('the Lightbox dialog is not present initially', () => {
      expect(screen.queryByTestId('lightbox-dialog')).not.toBeInTheDocument();
    });
  });

  describe('expand control availability', () => {
    const expandControl = () => screen.queryByRole('button', { name: expandImage$() });

    it('renders no control on an image under 100px in either dimension', async () => {
      await loadImage(img, { width: 800, height: 60 }, { width: 1600, height: 1200 });

      expect(expandControl()).not.toBeInTheDocument();
    });

    it('renders no control on an image displayed at its natural size', async () => {
      await loadImage(img, { width: 400, height: 300 }, { width: 400, height: 300 });

      expect(expandControl()).not.toBeInTheDocument();
    });

    it('adds and removes the control as a resize crosses the thresholds', async () => {
      await loadImage(img, { width: 80, height: 60 }, { width: 1600, height: 1200 });
      expect(expandControl()).not.toBeInTheDocument();

      img.getBoundingClientRect = jest.fn(() => ({ width: 800, height: 600 }));
      await fireEvent(window, new Event('resize'));
      expect(expandControl()).toBeInTheDocument();

      img.getBoundingClientRect = jest.fn(() => ({ width: 80, height: 60 }));
      await fireEvent(window, new Event('resize'));
      expect(expandControl()).not.toBeInTheDocument();
    });
  });

  describe('expanding the image', () => {
    it("opens the Lightbox if the 'Expand' button is clicked by a mouse", async () => {
      await user.click(expandButton);
      expect(screen.getByTestId('lightbox-dialog')).toBeInTheDocument();
    });

    it("opens the Lightbox if the 'Expand' button is clicked by a keyboard", async () => {
      expandButton.focus();
      await user.keyboard('{enter}');
      expect(screen.getByTestId('lightbox-dialog')).toBeInTheDocument();

      await user.click(screen.getByLabelText(closeAction$()));
      expect(screen.queryByTestId('lightbox-dialog')).not.toBeInTheDocument();

      expandButton.focus();
      await user.keyboard(' ');
      expect(screen.getByTestId('lightbox-dialog')).toBeInTheDocument();
    });
  });

  it("closes the Lightbox when the 'Close' button is clicked", async () => {
    await user.click(expandButton); // Open Lightbox first
    expect(screen.getByTestId('lightbox-dialog')).toBeInTheDocument();

    await user.click(screen.getByLabelText(closeAction$()));
    expect(screen.queryByTestId('lightbox-dialog')).not.toBeInTheDocument();
  });

  it("returns focus to the 'Expand' button when the Lightbox closes", async () => {
    await user.click(expandButton);
    await user.click(screen.getByLabelText(closeAction$()));

    await waitFor(() => expect(expandButton).toHaveFocus());
  });
});

describe('SafeHtmlImage carries allowlisted inline styles through SafeHTML', () => {
  const SafeHTML = createSafeHTML();
  const carriedAlt = 'carried';

  it('renders an allowlisted style on the image', () => {
    render(SafeHTML, {
      props: {
        html: `<img src="./pic.png" alt="${carriedAlt}" style="background-color: yellow;">`,
      },
    });
    expect(screen.getByAltText(carriedAlt)).toHaveStyle({ 'background-color': 'rgb(255, 255, 0)' });
  });

  // SafeHTML is functional and positional, so a new html payload reuses the
  // SafeHtmlImage instance already mounted at that position.
  it('applies a style that only appears on a later render of the same image', async () => {
    const { updateProps } = render(SafeHTML, {
      props: {
        html: `<img src="./pic.png" alt="${carriedAlt}">`,
      },
    });
    await updateProps({
      html: `<img src="./pic.png" alt="${carriedAlt}" style="background-color: yellow;">`,
    });

    expect(screen.getByAltText(carriedAlt)).toHaveStyle({ 'background-color': 'rgb(255, 255, 0)' });
  });
});

describe('SafeHtmlImage carries size attributes through SafeHTML', () => {
  const SafeHTML = createSafeHTML();
  const sizedAlt = 'sized';

  beforeAll(stubDialog);

  it.each([
    ['width and height', 'width="600" height="450"', ['600', '450']],
    ['only a width', 'width="600"', ['600', null]],
    ['only a height', 'height="450"', [null, '450']],
    ['a percentage height', 'height="50%"', [null, null]],
  ])('renders the image size for %s', (_, size, expected) => {
    render(SafeHTML, {
      props: { html: `<img src="./pic.png" alt="${sizedAlt}" ${size}>` },
    });
    const img = screen.getByAltText(sizedAlt);

    expect([img.getAttribute('width'), img.getAttribute('height')]).toEqual(expected);
  });

  it('expands a downsized image to its full resolution', async () => {
    render(SafeHTML, {
      props: { html: `<img src="./pic.png" alt="${sizedAlt}" width="400" height="300">` },
    });
    const img = screen.getByAltText(sizedAlt);
    await loadImage(img, { width: 400, height: 300 }, { width: 1600, height: 1200 });

    await userEvent.click(screen.getByRole('button', { name: expandImage$() }));

    const lightboxImg = within(screen.getByTestId('lightbox-dialog')).getByAltText(sizedAlt);
    expect(lightboxImg).toHaveAttribute('src', img.getAttribute('src'));
    expect(lightboxImg).not.toHaveAttribute('width');
  });

  it('derives the width of a height-only image from its natural ratio', async () => {
    render(SafeHTML, {
      props: { html: `<img src="./pic.png" alt="${sizedAlt}" height="150">` },
    });
    const img = screen.getByAltText(sizedAlt);
    await loadImage(img, { width: 200, height: 150 }, { width: 1600, height: 1200 });

    expect(img).toHaveAttribute('width', '200');
  });

  it('derives the width when a later render of the same image adds a height', async () => {
    const { updateProps } = render(SafeHTML, {
      props: { html: `<img src="./pic.png" alt="${sizedAlt}">` },
    });
    await loadImage(
      screen.getByAltText(sizedAlt),
      { width: 1600, height: 1200 },
      { width: 1600, height: 1200 },
    );
    await updateProps({ html: `<img src="./pic.png" alt="${sizedAlt}" height="150">` });

    expect(screen.getByAltText(sizedAlt)).toHaveAttribute('width', '200');
  });

  it.each([
    ['an unsized image', ''],
    ['a non-numeric height', 'height="auto"'],
    ['a percentage height', 'height="100%"'],
  ])('derives no width for %s', async (_, size) => {
    render(SafeHTML, {
      props: { html: `<img src="./pic.png" alt="${sizedAlt}" ${size}>` },
    });
    const img = screen.getByAltText(sizedAlt);
    await loadImage(img, { width: 200, height: 150 }, { width: 1600, height: 1200 });

    expect(img).not.toHaveAttribute('width');
  });

  it('keeps an authored width over the natural ratio', async () => {
    render(SafeHTML, {
      props: { html: `<img src="./pic.png" alt="${sizedAlt}" width="300" height="150">` },
    });
    const img = screen.getByAltText(sizedAlt);
    await loadImage(img, { width: 300, height: 150 }, { width: 1600, height: 1200 });

    expect(img).toHaveAttribute('width', '300');
  });
});
