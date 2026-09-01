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
});
