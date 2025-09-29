import { render, screen } from '@testing-library/vue';

import kolibri from 'kolibri';
import { createSafeHTML } from '../index';

jest.mock('kolibri', () => ({
  canHandleElement: jest.fn(),
}));

const SafeHTML = createSafeHTML();

const HELLO_WORLD_TEXT = 'Hello World';
const CONTENT_TEXT = 'Content';

describe('SafeHTML', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock: no element can be handled
    kolibri.canHandleElement = jest.fn().mockReturnValue(false);
  });

  describe('basic HTML sanitization', () => {
    it('renders basic HTML content', () => {
      render(SafeHTML, {
        props: {
          html: `<p>${HELLO_WORLD_TEXT}</p>`,
        },
      });
      expect(screen.getByText(HELLO_WORLD_TEXT)).toBeInTheDocument();
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

    it('strips forbidden attributes like style', () => {
      render(SafeHTML, {
        props: {
          html: `<div style="color: red;">${CONTENT_TEXT}</div>`,
        },
      });
      const div = screen.getByText(CONTENT_TEXT);
      expect(div).not.toHaveAttribute('style');
    });
  });

  describe('object tag handling', () => {
    it('allows object tags in the output', () => {
      const { container } = render(SafeHTML, {
        props: {
          html: '<object data="test.pdf" type="application/pdf">PDF</object>',
        },
      });
      expect(container.querySelector('object')).toBeInTheDocument();
    });

    it('preserves data attribute on object tags', () => {
      const { container } = render(SafeHTML, {
        props: {
          html: '<object data="test.pdf" type="application/pdf">PDF</object>',
        },
      });
      const objectEl = container.querySelector('object');
      expect(objectEl).toHaveAttribute('data', 'test.pdf');
    });

    it('preserves type attribute on object tags', () => {
      const { container } = render(SafeHTML, {
        props: {
          html: '<object data="video.mp4" type="video/mp4">Video</object>',
        },
      });
      const objectEl = container.querySelector('object');
      expect(objectEl).toHaveAttribute('type', 'video/mp4');
    });
  });

  describe('data attribute sanitization', () => {
    it('allows valid file URLs in data attribute', () => {
      const { container } = render(SafeHTML, {
        props: {
          html: '<object data="/path/to/file.pdf" type="application/pdf">PDF</object>',
        },
      });
      const objectEl = container.querySelector('object');
      expect(objectEl).toHaveAttribute('data', '/path/to/file.pdf');
    });

    it('allows blob URLs in data attribute', () => {
      const { container } = render(SafeHTML, {
        props: {
          html: '<object data="blob:https://example.com/12345" type="application/pdf">PDF</object>',
        },
      });
      const objectEl = container.querySelector('object');
      expect(objectEl).toHaveAttribute('data', 'blob:https://example.com/12345');
    });

    it('sanitizes javascript URLs in data attribute', () => {
      const { container } = render(SafeHTML, {
        props: {
          html: '<object data="javascript:alert(1)" type="application/pdf">PDF</object>',
        },
      });
      const objectEl = container.querySelector('object');
      // DOMPurify should remove or sanitize the dangerous URL
      expect(objectEl?.getAttribute('data')).not.toBe('javascript:alert(1)');
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

    it('allows data attributes on object tags matching an allowed origin', () => {
      const SafeHTMLWithOrigins = createSafeHTML({}, { allowedOrigins: ['http://localhost:8000'] });
      const { container } = render(SafeHTMLWithOrigins, {
        props: {
          html: '<object data="http://localhost:8000/zipcontent/doc.pdf" type="application/pdf"></object>',
        },
      });
      const obj = container.querySelector('object');
      expect(obj).toHaveAttribute('data', 'http://localhost:8000/zipcontent/doc.pdf');
    });

    it('still allows blob and data URIs when origins are specified', () => {
      const SafeHTMLWithOrigins = createSafeHTML({}, { allowedOrigins: ['http://localhost:8000'] });
      const { container } = render(SafeHTMLWithOrigins, {
        props: {
          html: '<object data="blob:https://example.com/12345" type="application/pdf"></object>',
        },
      });
      const obj = container.querySelector('object');
      expect(obj).toHaveAttribute('data', 'blob:https://example.com/12345');
    });

    it('still allows relative URIs when origins are specified', () => {
      const SafeHTMLWithOrigins = createSafeHTML({}, { allowedOrigins: ['http://localhost:8000'] });
      const { container } = render(SafeHTMLWithOrigins, {
        props: {
          html: '<object data="./file.pdf" type="application/pdf"></object>',
        },
      });
      const obj = container.querySelector('object');
      expect(obj).toHaveAttribute('data', './file.pdf');
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
});
