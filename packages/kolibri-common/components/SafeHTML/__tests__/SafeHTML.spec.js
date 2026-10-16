import Vue from 'vue';
import { render, screen, waitFor, within } from '@testing-library/vue';
import DOMPurify from 'dompurify';
import { CHTML } from 'mathjax-full/js/output/chtml';

import kolibri from 'kolibri';
import { createSafeHTML } from '../index';

jest.mock('kolibri', () => ({
  canHandleElement: jest.fn(),
  objectViewerMimetypes: jest.fn(() => []),
}));

// The MathJax fallback's font URL needs plugin URL data that tests lack.
jest.mock('kolibri/urls');

// Stub the ContentViewer so a handled object surfaces the file it received via
// its `element` prop as `data-src`, letting tests assert what reaches the viewer.
Vue.component('ContentViewer', {
  props: { element: { type: null, default: null } },
  render(h) {
    return h('div', {
      attrs: {
        'data-testid': 'content-viewer',
        'data-src': this.element && this.element.getAttribute('data'),
      },
    });
  },
});

const SafeHTML = createSafeHTML();

const HELLO_WORLD_TEXT = 'Hello World';
const CONTENT_TEXT = 'Content';
const FIRST_TEXT = 'First paragraph';
const SECOND_TEXT = 'Second paragraph';
const PROBE_HTML = '<probe-element></probe-element>';

// MIME types a viewer hook registers an object[type="..."] selector for.
const HANDLED_OBJECT_TYPES = ['application/pdf', 'video/mp4'];

// Mirror the real mediator: an object MIME type is handled only if a viewer
// registered a selector for it. canHandleElement routes the element;
// objectViewerMimetypes gates its data attribute. They must agree.
function handleObjectTypes(types = HANDLED_OBJECT_TYPES) {
  kolibri.canHandleElement = jest.fn(
    el => el && el.tagName === 'OBJECT' && types.includes(el.getAttribute('type')),
  );
  kolibri.objectViewerMimetypes = jest.fn(() => types);
}

describe('SafeHTML', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock: no element can be handled
    kolibri.canHandleElement = jest.fn().mockReturnValue(false);
    kolibri.objectViewerMimetypes = jest.fn(() => []);
  });

  describe('basic HTML sanitization', () => {
    it('renders basic HTML content', () => {
      render(SafeHTML, {
        props: {
          html: `<p>${HELLO_WORLD_TEXT}</p>`,
        },
      });
      expect(screen.getByText(HELLO_WORLD_TEXT).tagName).toBe('P');
    });

    it('adds safe-html class to elements', () => {
      render(SafeHTML, {
        props: {
          html: `<div id="test-div">${CONTENT_TEXT}</div>`,
        },
      });
      const div = screen.getByText(CONTENT_TEXT);
      expect(div).toHaveClass('safe-html');
    });

    it('strips forbidden tags like style', () => {
      const { container } = render(SafeHTML, {
        props: {
          html: '<div>Content<style>.foo { color: red; }</style></div>',
        },
      });
      expect(container.querySelector('style')).not.toBeInTheDocument();
    });

    it('retains an allowlisted style attribute', () => {
      render(SafeHTML, {
        props: {
          html: `<div style="color: red;">${CONTENT_TEXT}</div>`,
        },
      });
      const div = screen.getByText(CONTENT_TEXT);
      expect(div).toHaveStyle({ color: 'rgb(255, 0, 0)' });
    });

    it.each([
      ['div', `<div width="600" height="450">${CONTENT_TEXT}</div>`],
      ['table', `<table width="600" height="450"><tr><td>${CONTENT_TEXT}</td></tr></table>`],
    ])('strips width and height from a %s', (tag, html) => {
      render(SafeHTML, { props: { html } });
      const element = screen.getByText(CONTENT_TEXT).closest(tag);
      expect(element).not.toHaveAttribute('width');
      expect(element).not.toHaveAttribute('height');
    });
  });

  describe('inline style allowlist', () => {
    it('retains text-align', () => {
      render(SafeHTML, {
        props: {
          html: `<div style="text-align: center;">${CONTENT_TEXT}</div>`,
        },
      });
      expect(screen.getByText(CONTENT_TEXT)).toHaveStyle({ 'text-align': 'center' });
    });

    it('retains color', () => {
      render(SafeHTML, {
        props: {
          html: `<div style="color: rgb(0, 128, 0);">${CONTENT_TEXT}</div>`,
        },
      });
      expect(screen.getByText(CONTENT_TEXT)).toHaveStyle({ color: 'rgb(0, 128, 0)' });
    });

    it('retains background-color', () => {
      render(SafeHTML, {
        props: {
          html: `<div style="background-color: yellow;">${CONTENT_TEXT}</div>`,
        },
      });
      expect(screen.getByText(CONTENT_TEXT)).toHaveStyle({
        'background-color': 'rgb(255, 255, 0)',
      });
    });

    it('retains multiple allowlisted properties on one element', () => {
      render(SafeHTML, {
        props: {
          html: `<div style="color: red; text-align: right;">${CONTENT_TEXT}</div>`,
        },
      });
      const div = screen.getByText(CONTENT_TEXT);
      expect(div).toHaveStyle({ color: 'rgb(255, 0, 0)', 'text-align': 'right' });
    });

    it('retains the text-decoration shorthand', () => {
      render(SafeHTML, {
        props: {
          html: `<span style="text-decoration: underline line-through;">${CONTENT_TEXT}</span>`,
        },
      });
      expect(screen.getByText(CONTENT_TEXT)).toHaveStyle({
        'text-decoration': 'underline line-through',
      });
    });

    it.each([
      ['text-decoration-line', 'underline'],
      ['text-decoration-style', 'wavy'],
      ['text-decoration-color', 'red'],
      ['text-decoration-thickness', '2px'],
    ])('retains %s', (prop, value) => {
      render(SafeHTML, {
        props: {
          html: `<span style="${prop}: ${value};">${CONTENT_TEXT}</span>`,
        },
      });
      expect(screen.getByText(CONTENT_TEXT)).toHaveStyle({ [prop]: value });
    });

    it.each([
      ['text-decoration', 'none'],
      ['text-decoration-line', 'none'],
    ])('does not let %s: none remove the underline from a link', (prop, value) => {
      render(SafeHTML, {
        props: {
          html: `<a href="https://example.com" style="${prop}: ${value}; color: red;">${CONTENT_TEXT}</a>`,
        },
      });
      const link = screen.getByText(CONTENT_TEXT);
      expect(link.getAttribute('style')).not.toContain('none');
      expect(link).toHaveStyle({ color: 'rgb(255, 0, 0)' });
    });

    it('retains text-decoration: none on non-link elements', () => {
      render(SafeHTML, {
        props: {
          html: `<span style="text-decoration: none;">${CONTENT_TEXT}</span>`,
        },
      });
      expect(screen.getByText(CONTENT_TEXT)).toHaveStyle({ 'text-decoration': 'none' });
    });

    it('drops non-allowlisted properties while keeping allowlisted ones', () => {
      render(SafeHTML, {
        props: {
          html: `<div style="position: absolute; display: none; color: blue;">${CONTENT_TEXT}</div>`,
        },
      });
      const div = screen.getByText(CONTENT_TEXT);
      expect(div).toHaveStyle({ color: 'rgb(0, 0, 255)' });
      const styleAttr = div.getAttribute('style') || '';
      expect(styleAttr).not.toContain('position');
      expect(styleAttr).not.toContain('display');
    });

    it('removes the style attribute entirely when nothing is allowlisted', () => {
      render(SafeHTML, {
        props: {
          html: `<div style="position: absolute; display: none;">${CONTENT_TEXT}</div>`,
        },
      });
      expect(screen.getByText(CONTENT_TEXT)).not.toHaveAttribute('style');
    });

    it('never surfaces a dangerous value on a non-allowlisted property', () => {
      render(SafeHTML, {
        props: {
          html: `<div style="background: url(javascript:alert(1)); color: green;">${CONTENT_TEXT}</div>`,
        },
      });
      const div = screen.getByText(CONTENT_TEXT);
      expect(div).toHaveStyle({ color: 'rgb(0, 128, 0)' });
      const styleAttr = div.getAttribute('style') || '';
      expect(styleAttr).not.toContain('javascript');
      expect(styleAttr).not.toContain('url(');
    });

    it('rejects an invalid value on an allowlisted property via the CSSOM', () => {
      render(SafeHTML, {
        props: {
          html: `<div style="color: not-a-real-color; text-align: center;">${CONTENT_TEXT}</div>`,
        },
      });
      const div = screen.getByText(CONTENT_TEXT);
      expect(div).toHaveStyle({ 'text-align': 'center' });
      // The invalid value resolves to '' in the CSSOM, so color is dropped entirely.
      const styleAttr = div.getAttribute('style') || '';
      expect(styleAttr).not.toContain('color');
      expect(styleAttr).not.toContain('not-a-real-color');
    });

    it('still strips a <style> block', () => {
      const { container } = render(SafeHTML, {
        props: {
          html: '<div>Content<style>.foo { color: red; }</style></div>',
        },
      });
      expect(container.querySelector('style')).not.toBeInTheDocument();
    });
  });

  describe('DOMPurify instance isolation', () => {
    it('leaves the shared DOMPurify export unhooked', () => {
      const sanitized = DOMPurify.sanitize('<div style="font-size: 12px;">x</div>');
      expect(sanitized).toContain('font-size');
    });
  });

  describe('custom components', () => {
    // Mirrors the QTI interaction components: classes and styles its own root,
    // and re-renders off its own reactive state rather than a prop.
    const CustomChoice = {
      name: 'CustomChoice',
      props: { identifier: { type: String, default: '' } },
      data() {
        return { selected: false };
      },
      render(h) {
        return h(
          'li',
          {
            class: ['custom-choice', this.selected ? 'is-selected' : ''],
            on: { click: () => (this.selected = true) },
          },
          this.$slots.default,
        );
      },
    };

    function renderChoice() {
      const SafeHTMLWithCustom = createSafeHTML({ 'custom-choice': CustomChoice });
      return render(SafeHTMLWithCustom, {
        props: { html: `<custom-choice identifier="A">${CONTENT_TEXT}</custom-choice>` },
      });
    }

    it('keeps the component class on first render rather than overwriting it', () => {
      renderChoice();
      expect(screen.getByText(CONTENT_TEXT)).toHaveClass('custom-choice');
    });

    it('leaves the component to opt into safe-html itself', () => {
      renderChoice();
      expect(screen.getByText(CONTENT_TEXT)).not.toHaveClass('safe-html');
    });

    it('still passes the authored class through for components to read', () => {
      const seen = [];
      const ClassReader = {
        name: 'ClassReader',
        render(h) {
          seen.push(this.$attrs.class);
          return h('div');
        },
      };
      const SafeHTMLWithCustom = createSafeHTML({ 'class-reader': ClassReader });
      render(SafeHTMLWithCustom, {
        props: { html: '<class-reader class="qti-labels-decimal"></class-reader>' },
      });
      expect(seen).toEqual(['qti-labels-decimal']);
    });

    it('keeps a size attribute only when the component declares it as a prop', () => {
      const seen = [];
      const SizedBox = {
        name: 'SizedBox',
        props: { width: { type: String, default: null } },
        render(h) {
          seen.push([this.width, this.$attrs.height]);
          return h('div');
        },
      };
      const SafeHTMLWithCustom = createSafeHTML({ 'sized-box': SizedBox });
      render(SafeHTMLWithCustom, {
        props: { html: '<sized-box width="600" height="450"></sized-box>' },
      });
      expect(seen).toEqual([['600', undefined]]);
    });
  });

  describe('object tag handling', () => {
    beforeEach(() => handleObjectTypes());

    it('routes a handled object through the ContentViewer with its file', () => {
      const { container } = render(createSafeHTML(), {
        props: {
          html: '<object data="test.pdf" type="application/pdf">PDF</object>',
        },
      });
      // A renderable object is replaced by the ContentViewer, which receives the file.
      expect(container.querySelector('object')).not.toBeInTheDocument();
      expect(container.querySelector('[data-testid="content-viewer"]')).toHaveAttribute(
        'data-src',
        'test.pdf',
      );
    });

    it('renders an unhandled object inertly without its data', () => {
      const { container } = render(createSafeHTML(), {
        props: {
          html: '<object data="thing.bin" type="application/x-unknown">x</object>',
        },
      });
      const objectEl = container.querySelector('object');
      expect(objectEl).toBeInTheDocument();
      expect(objectEl).not.toHaveAttribute('data');
    });
  });

  describe('data attribute sanitization', () => {
    beforeEach(() => handleObjectTypes());

    it('passes a valid file URL to the ContentViewer', () => {
      const { container } = render(createSafeHTML(), {
        props: {
          html: '<object data="/path/to/file.pdf" type="application/pdf">PDF</object>',
        },
      });
      expect(container.querySelector('[data-testid="content-viewer"]')).toHaveAttribute(
        'data-src',
        '/path/to/file.pdf',
      );
    });

    it('passes a blob URL to the ContentViewer', () => {
      const { container } = render(createSafeHTML(), {
        props: {
          html: '<object data="blob:https://example.com/12345" type="application/pdf">PDF</object>',
        },
      });
      expect(container.querySelector('[data-testid="content-viewer"]')).toHaveAttribute(
        'data-src',
        'blob:https://example.com/12345',
      );
    });

    it('drops javascript: URLs before they reach the ContentViewer', () => {
      const { container } = render(createSafeHTML(), {
        props: {
          html: '<object data="javascript:alert(1)" type="application/pdf">PDF</object>',
        },
      });
      // DOMPurify removes the dangerous URL, so nothing reaches the viewer.
      expect(container.querySelector('[data-testid="content-viewer"]')).not.toHaveAttribute(
        'data-src',
      );
    });

    it('strips a base64 data: HTML payload on an unhandled object type', () => {
      // Decodes to: <script>alert('Hello from Object!');</script>
      const payload =
        'data:text/html;base64,PHNjcmlwdD5hbGVydCgnSGVsbG8gZnJvbSBPYmplY3QhJyk7PC9zY3JpcHQ+';
      const { container } = render(createSafeHTML(), {
        props: {
          html: `<object data="${payload}" type="text/html">payload</object>`,
        },
      });
      // text/html is not a handled type, so the object renders inertly with no data.
      expect(container.querySelector('object')).not.toHaveAttribute('data');
    });

    it('strips a data: HTML payload even when the type attribute claims a handled mimetype', () => {
      // The type attribute lies (application/pdf), but the data: URI carries its own
      // text/html media type, which the browser would honour and execute.
      const payload =
        'data:text/html;base64,PHNjcmlwdD5hbGVydCgnSGVsbG8gZnJvbSBPYmplY3QhJyk7PC9zY3JpcHQ+';
      const { container } = render(createSafeHTML(), {
        props: {
          html: `<object data="${payload}" type="application/pdf">payload</object>`,
        },
      });
      // Routed to the ContentViewer by the lying type, but the payload is stripped first.
      expect(container.querySelector('[data-testid="content-viewer"]')).not.toHaveAttribute(
        'data-src',
      );
    });

    it('keeps a data: URI whose own mimetype is handled', () => {
      const payload = 'data:application/pdf;base64,JVBERi0xLjQ=';
      const { container } = render(createSafeHTML(), {
        props: {
          html: `<object data="${payload}" type="application/pdf">PDF</object>`,
        },
      });
      expect(container.querySelector('[data-testid="content-viewer"]')).toHaveAttribute(
        'data-src',
        payload,
      );
    });
  });

  describe('ContentViewer integration', () => {
    it('calls canHandleElement for object tags', () => {
      render(SafeHTML, {
        props: {
          html: '<object data="video.mp4" type="video/mp4">Video</object>',
        },
      });
      expect(kolibri.canHandleElement).toHaveBeenCalled();
    });

    it('renders ContentViewer when element can be handled', () => {
      kolibri.canHandleElement = jest.fn().mockReturnValue(true);

      const { container } = render(SafeHTML, {
        props: {
          html: '<video src="video.mp4"></video>',
        },
      });

      // Original <video> should be replaced by the ContentViewer stub.
      expect(container.querySelector('video')).not.toBeInTheDocument();
    });

    it('wraps the ContentViewer in an embedded layout container', () => {
      kolibri.canHandleElement = jest.fn().mockReturnValue(true);

      const { container } = render(SafeHTML, {
        props: {
          html: '<video src="video.mp4"></video>',
        },
      });

      expect(
        container.querySelector('.embedded-content-viewer > [data-testid="content-viewer"]'),
      ).toBeInTheDocument();
    });

    it('renders original element when canHandleElement returns false', () => {
      kolibri.canHandleElement = jest.fn().mockReturnValue(false);

      const { container } = render(SafeHTML, {
        props: {
          html: '<video src="video.mp4"></video>',
        },
      });

      expect(container.querySelector('video')).toBeInTheDocument();
    });

    it('checks video elements for ContentViewer handling', () => {
      render(SafeHTML, {
        props: {
          html: '<video src="video.mp4"><source src="video.webm" type="video/webm"></video>',
        },
      });

      expect(kolibri.canHandleElement).toHaveBeenCalled();
      // Verify it was called with a video element
      const call = kolibri.canHandleElement.mock.calls.find(
        call => call[0].tagName?.toLowerCase() === 'video',
      );
      expect(call).toBeTruthy();
    });

    it('checks audio elements for ContentViewer handling', () => {
      render(SafeHTML, {
        props: {
          html: '<audio src="audio.mp3"></audio>',
        },
      });

      expect(kolibri.canHandleElement).toHaveBeenCalled();
      const call = kolibri.canHandleElement.mock.calls.find(
        call => call[0].tagName?.toLowerCase() === 'audio',
      );
      expect(call).toBeTruthy();
    });
  });

  describe('allowed origins', () => {
    it('strips src attributes with absolute URLs by default', () => {
      const { container } = render(SafeHTML, {
        props: {
          html: '<audio src="http://localhost:8000/zipcontent/abc123.mp3" controls></audio>',
        },
      });
      const audio = container.querySelector('audio');
      expect(audio).toBeInTheDocument();
      expect(audio).not.toHaveAttribute('src');
    });

    it('allows src attributes matching an allowed origin', () => {
      const SafeHTMLWithOrigins = createSafeHTML({}, { allowedOrigins: ['http://localhost:8000'] });
      const { container } = render(SafeHTMLWithOrigins, {
        props: {
          html: '<audio src="http://localhost:8000/zipcontent/abc123.mp3" controls></audio>',
        },
      });
      const audio = container.querySelector('audio');
      expect(audio).toHaveAttribute('src', 'http://localhost:8000/zipcontent/abc123.mp3');
    });

    it('strips src attributes not matching any allowed origin', () => {
      const SafeHTMLWithOrigins = createSafeHTML({}, { allowedOrigins: ['http://localhost:8000'] });
      const { container } = render(SafeHTMLWithOrigins, {
        props: {
          html: '<audio src="http://evil.com/malicious.mp3" controls></audio>',
        },
      });
      const audio = container.querySelector('audio');
      expect(audio).not.toHaveAttribute('src');
    });

    it('passes object data matching an allowed origin to the ContentViewer', () => {
      handleObjectTypes();
      const SafeHTMLWithOrigins = createSafeHTML({}, { allowedOrigins: ['http://localhost:8000'] });
      const { container } = render(SafeHTMLWithOrigins, {
        props: {
          html: '<object data="http://localhost:8000/zipcontent/doc.pdf" type="application/pdf"></object>',
        },
      });
      expect(container.querySelector('[data-testid="content-viewer"]')).toHaveAttribute(
        'data-src',
        'http://localhost:8000/zipcontent/doc.pdf',
      );
    });

    it('still passes blob URIs to the ContentViewer when origins are specified', () => {
      handleObjectTypes();
      const SafeHTMLWithOrigins = createSafeHTML({}, { allowedOrigins: ['http://localhost:8000'] });
      const { container } = render(SafeHTMLWithOrigins, {
        props: {
          html: '<object data="blob:https://example.com/12345" type="application/pdf"></object>',
        },
      });
      expect(container.querySelector('[data-testid="content-viewer"]')).toHaveAttribute(
        'data-src',
        'blob:https://example.com/12345',
      );
    });

    it('still passes relative URIs to the ContentViewer when origins are specified', () => {
      handleObjectTypes();
      const SafeHTMLWithOrigins = createSafeHTML({}, { allowedOrigins: ['http://localhost:8000'] });
      const { container } = render(SafeHTMLWithOrigins, {
        props: {
          html: '<object data="./file.pdf" type="application/pdf"></object>',
        },
      });
      expect(container.querySelector('[data-testid="content-viewer"]')).toHaveAttribute(
        'data-src',
        './file.pdf',
      );
    });
  });

  describe('semantics tag handling', () => {
    it('allows semantics tag for MathML content', () => {
      const { container } = render(SafeHTML, {
        props: {
          html: '<math><semantics><mi>x</mi></semantics></math>',
        },
      });
      // Check that semantics tag is in the rendered output
      expect(container.innerHTML).toContain('semantics');
      expect(container.innerHTML).toContain('<mi');
    });
  });

  describe('MathML rendering', () => {
    const FIRST = 'a';
    const SECOND = 'b';

    // Named, so tests can find the rendered expression by role.
    function mathOf(identifier, attrs = '') {
      return `<math alttext="${identifier}"><mi ${attrs}>${identifier}</mi></math>`;
    }

    // Started later, so it renders after every earlier expression's run.
    async function renderAfterEarlierRuns() {
      render(createSafeHTML(), { props: { html: mathOf(SECOND) } });
      const second = await screen.findByRole('img', { name: SECOND });
      await waitFor(() => expect(second.querySelector('mjx-container')).not.toBeNull());
    }

    async function findMathJaxOutput() {
      const wrapper = await screen.findByTestId('mathjax-output');
      await waitFor(() => expect(wrapper.querySelector('mjx-container')).toBeInTheDocument());
      return wrapper;
    }

    describe('when the browser cannot lay out MathML', () => {
      // jsdom has no layout, so the probe measures a zero box, as Chromium < 109 does.

      it('renders the expression with MathJax', async () => {
        render(createSafeHTML(), { props: { html: '<math><mi>x</mi></math>' } });
        const wrapper = await findMathJaxOutput();
        expect(wrapper.querySelector('math.safe-html')).toBeNull();
      });

      it('leaves the Perseus viewer room to add its own MathJax styles', async () => {
        render(createSafeHTML(), { props: { html: '<math><mi>x</mi></math>' } });
        await findMathJaxOutput();
        // Perseus's MathJax appends its sheet only when this id is absent.
        expect(document.getElementById(CHTML.STYLESHEETID)).toBeNull();
      });

      it('renders an element with missing children without an error badge', async () => {
        render(createSafeHTML(), {
          props: { html: '<math><mfrac><mn>1</mn></mfrac></math>' },
        });
        const wrapper = await findMathJaxOutput();
        expect(wrapper.querySelector('mjx-mfrac')).toBeInTheDocument();
        expect(wrapper.querySelector('mjx-merror')).not.toBeInTheDocument();
      });

      it.each([
        ['an mtd outside an mtr', '<mtd><mi>x</mi></mtd>'],
        ['an mtr outside an mtable', '<mtr><mtd><mi>x</mi></mtd></mtr>'],
        ['an mprescripts outside an mmultiscripts', '<mprescripts/><mi>x</mi>'],
      ])('falls back to native math for %s', async (_, inner) => {
        const { container } = render(createSafeHTML(), {
          props: { html: `<math>${inner}</math>` },
        });
        await renderAfterEarlierRuns();
        expect(container.querySelector('math.safe-html')).not.toBeNull();
        expect(container.querySelector('mjx-container')).toBeNull();
      });

      it('gives assistive technology the native math in place of the MathJax output', async () => {
        render(createSafeHTML(), {
          props: { html: '<math><mfrac><mn>1</mn><mi>x</mi></mfrac></math>' },
        });
        const wrapper = await findMathJaxOutput();
        expect(within(wrapper).queryByRole('img')).not.toBeInTheDocument();
        expect(
          wrapper.querySelector('mjx-container').closest('[aria-hidden="true"]'),
        ).not.toBeNull();
        expect(
          wrapper.querySelector('math.visuallyhidden:not([aria-hidden]) mfrac'),
        ).not.toBeNull();
      });

      it.each(['alttext', 'aria-label'])(
        'names the expression with its authored %s',
        async attribute => {
          const AUTHORED = 'una fracción';
          render(createSafeHTML(), {
            props: {
              html: `<math ${attribute}="${AUTHORED}"><mfrac><mn>1</mn><mi>x</mi></mfrac></math>`,
            },
          });
          expect(await screen.findByRole('img', { name: AUTHORED })).toBeInTheDocument();
        },
      );

      it('names the expression with aria-label over alttext', async () => {
        const ARIA_LABEL = 'aria';
        render(createSafeHTML(), {
          props: { html: `<math alttext="alt" aria-label="${ARIA_LABEL}"><mi>x</mi></math>` },
        });
        expect(await screen.findByRole('img', { name: ARIA_LABEL })).toBeInTheDocument();
      });

      it('keeps an authored aria-hidden on the MathJax output', async () => {
        const HIDDEN = 'decor';
        render(createSafeHTML(), {
          props: { html: `<math aria-hidden="true" alttext="${HIDDEN}"><mi>x</mi></math>` },
        });
        await renderAfterEarlierRuns();
        expect(screen.queryByRole('img', { name: HIDDEN })).not.toBeInTheDocument();
        // Testing Library names no element that is itself aria-hidden.
        const [hidden] = screen.getAllByTestId('mathjax-output');
        expect(hidden).toHaveAttribute('aria-hidden', 'true');
        expect(hidden).toHaveAttribute('role', 'img');
        expect(hidden).toHaveAttribute('aria-label', HIDDEN);
      });

      it('keeps an authored aria-hidden when MathJax rejects the expression', async () => {
        const { container } = render(createSafeHTML(), {
          props: { html: '<math aria-hidden="true">2+2</math>' },
        });
        await renderAfterEarlierRuns();
        expect(container.querySelector('mjx-container')).toBeNull();
        expect(
          container.querySelector('math.safe-html').closest('[aria-hidden="true"]'),
        ).not.toBeNull();
      });

      it('drops alttext from elements other than math', () => {
        const { container } = render(createSafeHTML(), {
          props: { html: '<p alttext="p">p</p>' },
        });
        expect(container.querySelector('[alttext]')).toBeNull();
      });

      it('renders the new expression when html changes', async () => {
        const { container, updateProps } = render(createSafeHTML(), {
          props: { html: mathOf(FIRST) },
        });
        await waitFor(() => expect(container.querySelector('mjx-container')).not.toBeNull());
        await updateProps({ html: mathOf(SECOND) });
        expect(container.querySelector('mjx-container')).toBeNull();
        expect(container.querySelector('math.safe-html')).not.toBeNull();
        expect(await screen.findByRole('img', { name: SECOND })).toBeInTheDocument();
        await waitFor(() => expect(container.querySelector('mjx-container')).not.toBeNull());
        expect(screen.queryByRole('img', { name: FIRST })).not.toBeInTheDocument();
      });

      it('falls back to native math when MathJax rejects the new expression', async () => {
        const { container, updateProps } = render(createSafeHTML(), {
          props: { html: mathOf(FIRST) },
        });
        await screen.findByRole('img', { name: FIRST });
        // MathJax has no node type for bare text in <math>.
        await updateProps({ html: '<math>2+2</math>' });
        await waitFor(() =>
          expect(screen.queryByRole('img', { name: FIRST })).not.toBeInTheDocument(),
        );
        expect(container.querySelector('math.safe-html')).not.toBeNull();
        expect(container.querySelector('mjx-container')).toBeNull();
      });

      it('exposes the native math while MathJax loads', async () => {
        const { container } = render(createSafeHTML(), { props: { html: mathOf(FIRST) } });
        await Vue.nextTick();
        expect(container.querySelector('math.safe-html:not([aria-hidden])')).not.toBeNull();
        expect(container.querySelector('mjx-container')).toBeNull();
      });

      it('exposes the native math when MathJax rejects the expression', async () => {
        const { container } = render(createSafeHTML(), { props: { html: '<math>2+2</math>' } });
        await renderAfterEarlierRuns();
        expect(container.querySelector('math.safe-html:not([aria-hidden])')).not.toBeNull();
      });

      it('renders one expression per task', async () => {
        const { container } = render(createSafeHTML(), {
          props: { html: mathOf(FIRST) + mathOf(SECOND) },
        });
        await waitFor(() => expect(container.querySelectorAll('mjx-container')).toHaveLength(1));
        await waitFor(() => expect(container.querySelectorAll('mjx-container')).toHaveLength(2));
      });

      it.each([
        ['a link', 'href="first.html"', '[href]'],
        ['an id', 'id="first"', '[id]'],
        ['a tabindex', 'tabindex="0"', '[tabindex]'],
      ])('leaves %s out of the MathJax output', async (_, attribute, selector) => {
        render(createSafeHTML(), {
          props: { html: `<math ${attribute}><mi ${attribute}>x</mi></math>` },
        });
        const wrapper = await findMathJaxOutput();
        const output = wrapper.querySelector('mjx-container');
        expect(output.matches(selector) || output.querySelector(selector)).toBeFalsy();
      });

      it('keeps no focus stop in the visually hidden native math', async () => {
        render(createSafeHTML(), {
          props: { html: '<math tabindex="0"><mrow tabindex="0"><mi>x</mi></mrow></math>' },
        });
        const wrapper = await findMathJaxOutput();
        expect(
          wrapper.querySelector('.visuallyhidden[tabindex], .visuallyhidden [tabindex]'),
        ).toBeNull();
      });

      it('moves an authored tabindex on math onto the MathJax output', async () => {
        render(createSafeHTML(), { props: { html: '<math tabindex="0"><mi>x</mi></math>' } });
        const wrapper = await findMathJaxOutput();
        expect(wrapper).toHaveAttribute('tabindex', '0');
      });

      it('keeps an authored tabindex on native math that MathJax rejects', async () => {
        const { container } = render(createSafeHTML(), {
          props: { html: '<math tabindex="0">2+2</math>' },
        });
        await renderAfterEarlierRuns();
        expect(container.querySelector('math.safe-html[tabindex="0"]')).not.toBeNull();
      });

      it('keeps an id on the native math', async () => {
        render(createSafeHTML(), { props: { html: '<math id="first"><mi>x</mi></math>' } });
        const wrapper = await findMathJaxOutput();
        expect(wrapper.querySelectorAll('#first')).toHaveLength(1);
      });

      it('leaves an empty expression unnamed and out of the image role', async () => {
        render(createSafeHTML(), { props: { html: '<math></math>' } });
        const wrapper = await findMathJaxOutput();
        expect(within(wrapper).queryByRole('img')).not.toBeInTheDocument();
      });

      it('writes nothing once unmounted before MathJax loads', async () => {
        const consoleError = jest.spyOn(console, 'error');
        const { unmount } = render(createSafeHTML(), {
          props: { html: '<math><mi>x</mi></math>' },
        });
        unmount();
        await renderAfterEarlierRuns();
        expect(consoleError).not.toHaveBeenCalled();
        consoleError.mockRestore();
      });

      it('renders no style property that DOMPurify strips', async () => {
        render(createSafeHTML(), {
          props: { html: '<math><mi style="position: fixed; color: red">x</mi></math>' },
        });
        const wrapper = await findMathJaxOutput();
        // The kept color shows MathJax carried the sanitised style through.
        expect(wrapper.querySelector('[style*="color"]')).not.toBeNull();
        expect(wrapper.querySelector('[style*="fixed"]')).toBeNull();
      });

      it('renders the content around a styled expression', async () => {
        const BEFORE = 'before';
        const AFTER = 'after';
        render(createSafeHTML(), {
          props: {
            html: `<p>${BEFORE}</p><math style="color: red"><mi>x</mi></math><p>${AFTER}</p>`,
          },
        });
        const wrapper = await findMathJaxOutput();
        expect(wrapper.previousElementSibling).toHaveTextContent(BEFORE);
        expect(wrapper.nextElementSibling).toHaveTextContent(AFTER);
      });

      it('renders the spacing an mspace sets', async () => {
        render(createSafeHTML(), {
          props: { html: '<math><mi>x</mi><mspace width="1em"/><mi>y</mi></math>' },
        });
        const wrapper = await findMathJaxOutput();
        expect(wrapper.querySelector('mjx-mspace')).toHaveStyle({ width: '1em' });
      });

      describe('in a table', () => {
        // jsdom lays nothing out, so both widths read 0 until stubbed.
        const widths = { scrollWidth: 0, clientWidth: 0 };

        beforeEach(() => {
          jest
            .spyOn(Element.prototype, 'scrollWidth', 'get')
            .mockImplementation(() => widths.scrollWidth);
          jest
            .spyOn(Element.prototype, 'clientWidth', 'get')
            .mockImplementation(() => widths.clientWidth);
        });

        afterEach(() => {
          jest.restoreAllMocks();
        });

        it('takes a tab stop when the MathJax output overflows the table', async () => {
          render(createSafeHTML(), {
            props: { html: `<table><tr><td>${mathOf(FIRST)}</td></tr></table>` },
          });
          const container = screen.getByTestId('table-container');
          expect(container).not.toHaveAttribute('tabindex');

          // The native math fit; the MathJax output does not.
          Object.assign(widths, { scrollWidth: 1200, clientWidth: 900 });
          await findMathJaxOutput();
          await waitFor(() => expect(container).toHaveAttribute('tabindex', '0'));
        });
      });
    });

    describe('when the browser lays out MathML', () => {
      beforeEach(() => {
        jest
          .spyOn(Element.prototype, 'getBoundingClientRect')
          .mockReturnValue({ width: 77, height: 23 });
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('renders native math and no MathJax output', () => {
        const { container } = render(createSafeHTML(), {
          props: { html: '<math><mi>x</mi></math>' },
        });
        // jsdom's MathML elements aren't HTMLElements, which toBeInTheDocument requires.
        expect(container.querySelector('math.safe-html')).not.toBeNull();
        expect(screen.queryByTestId('mathjax-output')).not.toBeInTheDocument();
      });

      it('drops authored alttext from native math', () => {
        const { container } = render(createSafeHTML(), {
          props: { html: '<math alttext="x"><mi>x</mi></math>' },
        });
        expect(container.querySelector('math.safe-html')).not.toBeNull();
        expect(container.querySelector('[alttext]')).toBeNull();
      });

      it.each([
        ['mspace', '<mspace width="1em" height="2ex"/>'],
        ['mpadded', '<mpadded width="+1em" height="+2ex"><mi>x</mi></mpadded>'],
      ])('keeps width and height on an %s', (tag, inner) => {
        const { container } = render(createSafeHTML(), {
          props: { html: `<math>${inner}</math>` },
        });
        expect(container.querySelector(`${tag}[width][height]`)).not.toBeNull();
      });
    });
  });

  describe('re-render memoisation', () => {
    // Re-sanitising yields a fresh DOM node, so a second entry means `html` was
    // sanitised again.
    let probeNodes;
    let probeVm;
    const probed = jest.fn();

    const Probe = {
      name: 'ProbeElement',
      props: { node: { type: null, default: null } },
      created() {
        probeNodes.push(this.node);
        probeVm = this;
      },
      watch: {
        node(value) {
          probeNodes.push(value);
        },
      },
      render(h) {
        return h('span');
      },
    };

    const SafeHTMLWithProbe = createSafeHTML({ 'probe-element': Probe });

    // `tick` is captured per render, so a stale value means the probe reached a
    // handler captured at mount rather than SafeHTML's emit.
    const Parent = {
      name: 'MemoParent',
      props: {
        html: { type: String, default: '' },
        tick: { type: Number, default: 0 },
      },
      render(h) {
        const tick = this.tick;
        return h('div', [
          String(tick),
          h(SafeHTMLWithProbe, {
            props: { html: this.html },
            on: { probed: () => probed(tick) },
          }),
        ]);
      },
    };

    beforeEach(() => {
      probeNodes = [];
      probeVm = null;
    });

    it('leaves the rendered DOM in place while html is unchanged', async () => {
      const html = `<p>${FIRST_TEXT}</p>${PROBE_HTML}`;
      const { updateProps } = render(Parent, { props: { html, tick: 0 } });
      const paragraph = screen.getByText(FIRST_TEXT);
      expect(probeNodes).toHaveLength(1);
      await updateProps({ tick: 1 });
      // A parent re-render alone leaves an instance with an unchanged prop
      // untouched; forcing the render is what reaches the memoised fragment.
      probeVm.$parent.$forceUpdate();
      await Vue.nextTick();
      expect(probeNodes).toHaveLength(1);
      expect(screen.getByText(FIRST_TEXT)).toBe(paragraph);
    });

    it('renders the new content when html changes', async () => {
      const { updateProps } = render(Parent, { props: { html: `<p>${FIRST_TEXT}</p>` } });
      expect(screen.getByText(FIRST_TEXT)).toBeInTheDocument();
      await updateProps({ html: `<p>${SECOND_TEXT}</p>` });
      expect(screen.queryByText(FIRST_TEXT)).not.toBeInTheDocument();
      expect(screen.getByText(SECOND_TEXT)).toBeInTheDocument();
    });

    it('forwards a component event to the listener from the latest parent render', async () => {
      const { updateProps } = render(Parent, { props: { html: PROBE_HTML, tick: 0 } });
      await updateProps({ tick: 1 });
      probeVm.$emit('probed');
      expect(probed).toHaveBeenCalledWith(1);
    });

    it('forwards a listener registered under a modifier prefix', () => {
      // `~` is how the template compiler spells `@probed.once` in vnode `on` data.
      render(SafeHTMLWithProbe, {
        props: { html: PROBE_HTML },
        listeners: { '~probed': probed },
      });
      probeVm.$emit('probed');
      expect(probed).toHaveBeenCalledTimes(1);
    });
  });
});
