import Vue from 'vue';
import { render, screen } from '@testing-library/vue';
import DOMPurify from 'dompurify';

import kolibri from 'kolibri';
import { createSafeHTML } from '../index';

jest.mock('kolibri', () => ({
  canHandleElement: jest.fn(),
  objectViewerMimetypes: jest.fn(() => []),
}));

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
