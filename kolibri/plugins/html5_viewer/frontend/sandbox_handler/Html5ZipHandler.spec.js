import Mediator from 'kolibri-sandbox/mediator';
import Html5ZipHandler from './Html5ZipHandler';

describe('Html5ZipHandler', () => {
  let mediator;
  let sandbox;
  let handler;

  beforeEach(() => {
    mediator = new Mediator(window);
    sandbox = { mediator, registerHandler: jest.fn() };
    handler = new Html5ZipHandler(sandbox);
  });

  afterEach(() => {
    handler._destroyShims();
    mediator.destroy();
    delete window.API;
  });

  it('registers itself with the sandbox', () => {
    expect(sandbox.registerHandler).toHaveBeenCalledWith(handler);
  });

  it('exposes the SCORM API on the sandbox window, for content that reads window.parent.API', () => {
    expect(window.API).toBe(handler.shims.SCORM.shim);
  });

  it('exposes the same SCORM API object on the content window', () => {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    handler._initializeShims(iframe.contentWindow, { contentNamespace: 'test' });
    expect(iframe.contentWindow.API).toBe(window.API);
    document.body.removeChild(iframe);
  });

  describe('init', () => {
    function fakeIframe(headHtml = '') {
      const head = document.createElement('head');
      head.innerHTML = headHtml;
      return { contentDocument: { head } };
    }

    it('resolves once the content has loaded', async () => {
      const iframe = fakeIframe();
      const loaded = handler.init(iframe, '/zipcontent/abc123/index.html');
      iframe.onload();

      await expect(loaded).resolves.toBeUndefined();
      expect(iframe.src).toBe('/zipcontent/abc123/index.html');
    });

    it('resolves when the loaded document is a sandbox error page', async () => {
      // zip_wsgi serves a 404 body carrying this meta. Rejecting here would have the
      // sandbox report HANDLER_ERROR, and the connection-error modal is gated on
      // LOADING_ERROR - so classification has to stay with the sandbox.
      const iframe = fakeIframe('<meta name="sandbox-error" content="Not found">');
      const loaded = handler.init(iframe, '/zipcontent/abc123/index.html');
      iframe.onload();

      await expect(loaded).resolves.toBeUndefined();
    });

    it('rejects when the iframe itself fails to load', async () => {
      const iframe = fakeIframe();
      const loaded = handler.init(iframe, '/zipcontent/abc123/index.html');
      iframe.onerror();

      await expect(loaded).rejects.toThrow('Failed to load content');
    });
  });
});
