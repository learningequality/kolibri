import Mediator from 'kolibri-sandbox/mediator';
import Html5ZipHandler from './Html5ZipHandler';

describe('Html5ZipHandler', () => {
  let mediator;
  let sandbox;
  let handler;

  beforeEach(() => {
    mediator = new Mediator(window);
    sandbox = { mediator, registerHandler: jest.fn(), contentNamespace: 'test' };
    handler = new Html5ZipHandler(sandbox);
  });

  afterEach(() => {
    mediator.destroy();
    delete window.API;
  });

  function shimContent() {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    handler._initializeShims(iframe.contentWindow);
    return iframe;
  }

  it('leaves the sandbox window alone until content is shimmed', () => {
    // A handler the sandbox refuses is still constructed, and must not replace the
    // live handler's SCORM API.
    expect(window.API).toBeUndefined();
  });

  it('exposes the SCORM API on the sandbox window, for content that reads window.parent.API', () => {
    const iframe = shimContent();
    expect(window.API).toBe(handler.shims.SCORM.shim);
    iframe.remove();
  });

  it('exposes the Kolibri data API on the content window, for custom channels', () => {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    handler._initializeShims(iframe.contentWindow);
    expect(iframe.contentWindow.kolibri).toBe(handler.shims.kolibri.shim);
    document.body.removeChild(iframe);
  });

  it('exposes the same SCORM API object on the content window', () => {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    handler._initializeShims(iframe.contentWindow);
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
      let settled = false;
      loaded.then(() => (settled = true));
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(settled).toBe(false);
      expect(iframe.src).toBe('/zipcontent/abc123/index.html');

      iframe.onload();

      await expect(loaded).resolves.toBeUndefined();
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
  });
});
