import { events } from 'kolibri-sandbox/base';
import ZimHandler from '../ZimHandler';
import { EntryKinds, loadArticleIntoIframe } from '../articleLoader';
import { attachNavigationInterceptor } from '../navigationInterceptor';
import { ZimReader } from '../reader';

jest.mock('../articleLoader', () => ({
  EntryKinds: jest.requireActual('../articleLoader').EntryKinds,
  loadArticleIntoIframe: jest.fn(),
}));
jest.mock('../navigationInterceptor', () => ({
  attachNavigationInterceptor: jest.fn(() => jest.fn()),
  scrollToFragment: jest.fn(),
}));
jest.mock('../reader', () => ({ ZimReader: jest.fn() }));

function makeHandler() {
  const sandbox = {
    mediator: { registerMessageHandler: jest.fn(), sendMessage: jest.fn(), request: jest.fn() },
    registerHandler: jest.fn(),
  };
  const handler = new ZimHandler(sandbox);
  const iframe = document.createElement('iframe');
  document.body.appendChild(iframe);
  handler._iframe = iframe;
  handler._reader = {};
  return { handler, iframe };
}

function html(basePath, objectUrls = []) {
  return { kind: EntryKinds.HTML, basePath, objectUrls, file: null };
}

function svg() {
  return {
    kind: EntryKinds.FILE,
    basePath: 'C/Pic.svg',
    objectUrls: ['blob:svg'],
    file: { url: 'blob:svg', mimetype: 'image/svg+xml', name: 'Pic.svg' },
  };
}

function sentEvents(handler, event) {
  return handler.mediator.sendMessage.mock.calls
    .map(([message]) => message)
    .filter(message => message.event === event);
}

// jsdom doesn't fire 'load' for srcdoc.
async function settle(iframe, promise) {
  await new Promise(resolve => setTimeout(resolve, 0));
  iframe.dispatchEvent(new Event('load'));
  await promise;
}

describe('ZimHandler', () => {
  const realRevoke = URL.revokeObjectURL;
  let revoke;
  beforeEach(() => {
    revoke = jest.fn();
    URL.revokeObjectURL = revoke;
    loadArticleIntoIframe.mockReset();
  });
  afterEach(() => {
    URL.revokeObjectURL = realRevoke;
    document.body.innerHTML = '';
  });

  describe('blob URL lifecycle', () => {
    it('revokes the previous article object URLs when navigating to a new article', async () => {
      const { handler, iframe } = makeHandler();
      loadArticleIntoIframe.mockResolvedValueOnce(html('C/First', ['blob:a1', 'blob:a2']));
      await settle(iframe, handler._loadAndAttach('C/First'));
      expect(revoke).not.toHaveBeenCalled();

      loadArticleIntoIframe.mockResolvedValueOnce(html('C/Second', ['blob:b1']));
      await settle(iframe, handler._loadAndAttach('C/Second'));

      expect(revoke.mock.calls.map(c => c[0]).sort()).toEqual(['blob:a1', 'blob:a2']);
    });
  });

  describe('overlapping navigations', () => {
    it('lets only the latest navigation report and keep its URLs', async () => {
      const { handler, iframe } = makeHandler();
      let resolveFirst;
      loadArticleIntoIframe.mockImplementationOnce(
        (reader, path, frame, { isCurrent }) =>
          new Promise(resolve => {
            resolveFirst = () => resolve(isCurrent() ? html('C/First', ['blob:a1']) : null);
          }),
      );
      loadArticleIntoIframe.mockResolvedValueOnce(html('C/Second', ['blob:b1']));

      const first = handler._loadAndAttach('C/First');
      await settle(iframe, handler._loadAndAttach('C/Second'));
      resolveFirst();
      await first;

      expect(sentEvents(handler, events.NOW_SHOWING).map(m => m.data)).toEqual(['C/Second']);
      expect(handler._objectUrls).toEqual(['blob:b1']);
      expect(handler._currentPath).toBe('C/Second');
    });
  });

  describe('nowShowing', () => {
    it('reports the loaded entry as its canonical path to the host', async () => {
      const { handler, iframe } = makeHandler();
      loadArticleIntoIframe.mockResolvedValueOnce(html('C/Index', ['blob:a1']));
      await settle(iframe, handler._loadAndAttach('C/Index'));
      expect(sentEvents(handler, events.NOW_SHOWING)).toEqual([
        { nameSpace: 'sandbox', event: events.NOW_SHOWING, data: 'C/Index' },
      ]);
    });

    it('does not report when the loader yields no canonical path', async () => {
      const { handler, iframe } = makeHandler();
      loadArticleIntoIframe.mockResolvedValueOnce(html(undefined));
      await settle(iframe, handler._loadAndAttach('C/Index'));
      expect(sentEvents(handler, events.NOW_SHOWING)).toEqual([]);
    });

    it('does not report a file that has no page of its own', async () => {
      const { handler, iframe } = makeHandler();
      loadArticleIntoIframe.mockResolvedValueOnce(svg());
      await settle(iframe, handler._loadAndAttach('C/Pic.svg'));
      expect(sentEvents(handler, events.NOW_SHOWING)).toEqual([]);
    });
  });

  describe('files Kolibri does not render', () => {
    function overlay() {
      return document.querySelector('iframe[src="blob:svg"]');
    }

    async function openOverArticle() {
      const { handler, iframe } = makeHandler();
      loadArticleIntoIframe.mockResolvedValueOnce(html('C/Index', ['blob:a1']));
      await settle(iframe, handler._loadAndAttach('C/Index'));
      handler.mediator.sendMessage.mockClear();
      loadArticleIntoIframe.mockResolvedValueOnce(svg());
      await settle(iframe, handler._loadAndAttach('C/Pic.svg'));
      return { handler, iframe };
    }

    it('shows the file over the article it was opened from, which stays as it was', async () => {
      const { handler } = await openOverArticle();

      expect(overlay()).not.toBeNull();
      expect(sentEvents(handler, events.FILE_OVERLAY).map(m => m.data)).toEqual([true]);
      expect(handler._currentPath).toBe('C/Index');
      expect(handler._objectUrls).toEqual(['blob:a1']);
      expect(revoke).not.toHaveBeenCalled();
    });

    it('closes the file when the host asks, and frees it', async () => {
      const { handler } = await openOverArticle();

      handler.closeFile();

      expect(overlay()).toBeNull();
      expect(revoke).toHaveBeenCalledWith('blob:svg');
    });

    it('closes the file, and tells the host, when another article is shown', async () => {
      const { handler, iframe } = await openOverArticle();
      loadArticleIntoIframe.mockResolvedValueOnce(html('C/Other'));

      await settle(iframe, handler._loadAndAttach('C/Other'));

      expect(overlay()).toBeNull();
      expect(sentEvents(handler, events.FILE_OVERLAY).map(m => m.data)).toEqual([true, false]);
    });
  });

  describe('natively rendered entries', () => {
    const file = { mimetype: 'application/pdf', data: new Uint8Array([1]) };

    it('asks the host to render the file, and reports it as the page now showing', async () => {
      const { handler, iframe } = makeHandler();
      loadArticleIntoIframe.mockResolvedValueOnce({
        kind: EntryKinds.NATIVE,
        basePath: 'I/Doc.pdf',
        objectUrls: [],
        file,
      });
      await settle(iframe, handler._loadAndAttach('I/Doc.pdf'));
      expect(sentEvents(handler, events.RENDER_FILE).map(m => m.data)).toEqual([
        { ...file, hasPrevious: false },
      ]);
      expect(sentEvents(handler, events.NOW_SHOWING).map(m => m.data)).toEqual(['I/Doc.pdf']);
    });

    it('tells the host it can go back from a file opened from an article', async () => {
      const { handler, iframe } = makeHandler();
      loadArticleIntoIframe.mockResolvedValueOnce(html('C/Index'));
      await settle(iframe, handler._loadAndAttach('C/Index'));
      loadArticleIntoIframe.mockResolvedValueOnce({
        kind: EntryKinds.NATIVE,
        basePath: 'C/Doc.pdf',
        objectUrls: [],
        file,
      });

      await settle(iframe, handler._loadAndAttach('C/Doc.pdf'));

      expect(sentEvents(handler, events.RENDER_FILE).map(m => m.data)).toEqual([
        { ...file, hasPrevious: true },
      ]);
    });

    it('tells the host it cannot go back from an image it opened on', async () => {
      const { handler, iframe } = makeHandler();
      const image = { mimetype: 'image/png', data: new Uint8Array([1]), name: 'Pic.png' };
      loadArticleIntoIframe.mockResolvedValueOnce({
        kind: EntryKinds.NATIVE,
        basePath: 'I/Pic.png',
        objectUrls: [],
        file: image,
      });

      await settle(iframe, handler._loadAndAttach('I/Pic.png'));

      expect(sentEvents(handler, events.RENDER_FILE).map(m => m.data)).toEqual([
        { ...image, hasPrevious: false },
      ]);
    });

    it('keeps the article it was opened from working under it, for a host that only closes it', async () => {
      const { handler, iframe } = makeHandler();
      const detach = jest.fn();
      attachNavigationInterceptor.mockReturnValueOnce(detach);
      loadArticleIntoIframe.mockResolvedValueOnce(html('C/Index', ['blob:a1']));
      await settle(iframe, handler._loadAndAttach('C/Index'));
      loadArticleIntoIframe.mockResolvedValueOnce({
        kind: EntryKinds.NATIVE,
        basePath: 'C/Doc.pdf',
        objectUrls: [],
        file,
      });

      await settle(iframe, handler._loadAndAttach('C/Doc.pdf'));

      expect(detach).not.toHaveBeenCalled();
      expect(revoke).not.toHaveBeenCalled();
      expect(handler._objectUrls).toEqual(['blob:a1']);
      expect(handler._currentPath).toBe('C/Doc.pdf');
    });

    it('tracks the article again when a host that only closes the file closes it', async () => {
      const { handler, iframe } = makeHandler();
      loadArticleIntoIframe.mockResolvedValueOnce(html('C/Index', ['blob:a1']));
      await settle(iframe, handler._loadAndAttach('C/Index'));
      loadArticleIntoIframe.mockResolvedValueOnce({
        kind: EntryKinds.NATIVE,
        basePath: 'C/Doc.pdf',
        objectUrls: [],
        file,
      });
      await settle(iframe, handler._loadAndAttach('C/Doc.pdf'));

      handler.closeFile();

      expect(handler.shims.scrollProgress.getProgress()).not.toBeNull();
      expect(handler._currentPath).toBe('C/Index');
    });

    it('reports the page now showing before asking the host to render it', async () => {
      const { handler, iframe } = makeHandler();
      loadArticleIntoIframe.mockResolvedValueOnce({
        kind: EntryKinds.NATIVE,
        basePath: 'I/Doc.pdf',
        objectUrls: [],
        file,
      });
      await settle(iframe, handler._loadAndAttach('I/Doc.pdf'));
      const order = handler.mediator.sendMessage.mock.calls
        .map(([message]) => message.event)
        .filter(event => event === events.RENDER_FILE || event === events.NOW_SHOWING);
      expect(order).toEqual([events.NOW_SHOWING, events.RENDER_FILE]);
    });

    it('shows an image over the page it was opened from, which stays as it was', async () => {
      const { handler, iframe } = makeHandler();
      loadArticleIntoIframe.mockResolvedValueOnce(html('C/Index', ['blob:a1']));
      await settle(iframe, handler._loadAndAttach('C/Index'));
      handler.mediator.sendMessage.mockClear();
      const image = { mimetype: 'image/png', data: new Uint8Array([1]), name: 'Pic.png' };
      loadArticleIntoIframe.mockResolvedValueOnce({
        kind: EntryKinds.NATIVE,
        basePath: 'I/Pic.png',
        objectUrls: [],
        file: image,
      });

      await settle(iframe, handler._loadAndAttach('I/Pic.png'));

      expect(sentEvents(handler, events.RENDER_FILE).map(m => m.data)).toEqual([
        { ...image, hasPrevious: true },
      ]);
      expect(sentEvents(handler, events.NOW_SHOWING)).toEqual([]);
      expect(handler._currentPath).toBe('C/Index');
      expect(handler._objectUrls).toEqual(['blob:a1']);
      expect(revoke).not.toHaveBeenCalled();
    });

    it('clears the rendered file when an article is shown again', async () => {
      const { handler, iframe } = makeHandler();
      loadArticleIntoIframe.mockResolvedValueOnce({
        kind: EntryKinds.NATIVE,
        basePath: 'I/Doc.pdf',
        objectUrls: [],
        file,
      });
      await settle(iframe, handler._loadAndAttach('I/Doc.pdf'));
      loadArticleIntoIframe.mockResolvedValueOnce(html('C/Index'));
      await settle(iframe, handler._loadAndAttach('C/Index'));
      expect(sentEvents(handler, events.RENDER_FILE).map(m => m.data)).toEqual([
        { ...file, hasPrevious: false },
        null,
      ]);
    });

    it('does not message the host about files when only articles are shown', async () => {
      const { handler, iframe } = makeHandler();
      loadArticleIntoIframe.mockResolvedValueOnce(html('C/Index'));
      await settle(iframe, handler._loadAndAttach('C/Index'));
      expect(sentEvents(handler, events.RENDER_FILE)).toEqual([]);
    });
  });

  describe('progress', () => {
    it('reports an article that needs no scrolling as complete', async () => {
      const { handler, iframe } = makeHandler();
      loadArticleIntoIframe.mockResolvedValueOnce(html('C/Index'));
      await settle(iframe, handler._loadAndAttach('C/Index'));
      expect(sentEvents(handler, events.SHIMSTATEUPDATE).map(m => m.data.progress)).toEqual([1]);
    });
  });

  describe('navigation errors', () => {
    it('reports a failed in-article navigation to the host', async () => {
      const { handler } = makeHandler();
      loadArticleIntoIframe.mockRejectedValueOnce(new Error('Entry not found'));
      handler._navigate('C/Missing');
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(sentEvents(handler, events.ERROR).map(m => m.data)).toEqual([
        { message: 'Entry not found', error: 'LOADING_ERROR' },
      ]);
    });
  });

  describe('retarget (host-driven navigation)', () => {
    const startUrlFor = entry =>
      'https://kolibri.local/viewcontent#' +
      new URLSearchParams({ storage: 's', entry }).toString();

    it('is a no-op when retargeted to the entry it is already showing (loop guard)', async () => {
      const { handler, iframe } = makeHandler();
      loadArticleIntoIframe.mockResolvedValue(html('C/Index'));
      await settle(iframe, handler._loadAndAttach('C/Index'));
      loadArticleIntoIframe.mockClear();

      handler.retarget(startUrlFor('C/Index'));
      expect(loadArticleIntoIframe).not.toHaveBeenCalled();
    });

    it('navigates in place when retargeted to a different entry', async () => {
      const { handler, iframe } = makeHandler();
      loadArticleIntoIframe.mockResolvedValue(html('C/Index'));
      await settle(iframe, handler._loadAndAttach('C/Index'));
      loadArticleIntoIframe.mockClear();

      handler.retarget(startUrlFor('C/Other'));
      expect(loadArticleIntoIframe).toHaveBeenCalledWith(
        handler._reader,
        'C/Other',
        iframe,
        expect.anything(),
      );
    });

    it('stops showing the previous file before the new entry has loaded', async () => {
      const { handler, iframe } = makeHandler();
      const file = { mimetype: 'video/mp4', data: new Uint8Array([1]) };
      loadArticleIntoIframe.mockResolvedValueOnce({
        kind: EntryKinds.NATIVE,
        basePath: 'I/Clip.mp4',
        objectUrls: [],
        file,
      });
      await settle(iframe, handler._loadAndAttach('I/Clip.mp4'));
      loadArticleIntoIframe.mockReturnValueOnce(new Promise(() => {}));

      handler.retarget(startUrlFor('C/Index'));

      expect(sentEvents(handler, events.RENDER_FILE).map(m => m.data)).toEqual([
        { ...file, hasPrevious: false },
        null,
      ]);
    });

    it('returns to the article a page was opened from as it was left, without reloading it', async () => {
      const { handler, iframe } = makeHandler();
      const detach = jest.fn();
      attachNavigationInterceptor.mockReturnValueOnce(detach);
      loadArticleIntoIframe.mockResolvedValueOnce(html('C/Index', ['blob:a1']));
      await settle(iframe, handler._loadAndAttach('C/Index'));
      const el = iframe.contentDocument.scrollingElement || iframe.contentDocument.documentElement;
      Object.defineProperty(el, 'scrollHeight', { value: 1100, configurable: true });
      Object.defineProperty(el, 'clientHeight', { value: 100, configurable: true });
      iframe.contentWindow.requestAnimationFrame = callback => callback();
      handler.shims.scrollProgress.track(iframe.contentDocument);
      el.scrollTop = 500;
      iframe.contentWindow.dispatchEvent(new Event('scroll'));
      const file = { mimetype: 'application/pdf', data: new Uint8Array([1]) };
      loadArticleIntoIframe.mockResolvedValueOnce({
        kind: EntryKinds.NATIVE,
        basePath: 'C/Doc.pdf',
        objectUrls: [],
        file,
      });
      await settle(iframe, handler._loadAndAttach('C/Doc.pdf'));
      Object.defineProperty(el, 'scrollHeight', { value: 100, configurable: true });
      handler.mediator.sendMessage.mockClear();
      loadArticleIntoIframe.mockClear();

      handler.retarget(startUrlFor('C/Index'));

      expect(loadArticleIntoIframe).not.toHaveBeenCalled();
      expect(sentEvents(handler, events.RENDER_FILE).map(m => m.data)).toEqual([null]);
      expect(sentEvents(handler, events.SHIMSTATEUPDATE)).toEqual([]);
      expect(handler.shims.scrollProgress.getProgress()).toBe(0.5);
      expect(handler._currentPath).toBe('C/Index');
      expect(detach).not.toHaveBeenCalled();
      expect(revoke).not.toHaveBeenCalled();
    });

    it('keeps tracking the article when retargeted to a page and back', async () => {
      const { handler, iframe } = makeHandler();
      loadArticleIntoIframe.mockResolvedValueOnce(html('C/Index'));
      await settle(iframe, handler._loadAndAttach('C/Index'));
      loadArticleIntoIframe.mockResolvedValueOnce({
        kind: EntryKinds.NATIVE,
        basePath: 'C/Doc.pdf',
        objectUrls: [],
        file: { mimetype: 'application/pdf', data: new Uint8Array([1]) },
      });
      handler.retarget(startUrlFor('C/Doc.pdf'));
      await new Promise(resolve => setTimeout(resolve, 0));

      handler.retarget(startUrlFor('C/Index'));

      expect(loadArticleIntoIframe).toHaveBeenCalledTimes(2);
      expect(handler.shims.scrollProgress.getProgress()).toBe(1);
    });

    it('lets no earlier load replace the article it returned to', async () => {
      const { handler, iframe } = makeHandler();
      loadArticleIntoIframe.mockResolvedValueOnce(html('C/Index'));
      await settle(iframe, handler._loadAndAttach('C/Index'));
      loadArticleIntoIframe.mockResolvedValueOnce({
        kind: EntryKinds.NATIVE,
        basePath: 'C/Doc.pdf',
        objectUrls: [],
        file: { mimetype: 'application/pdf', data: new Uint8Array([1]) },
      });
      await settle(iframe, handler._loadAndAttach('C/Doc.pdf'));
      let resolveOther;
      loadArticleIntoIframe.mockImplementationOnce(
        (reader, path, frame, { isCurrent }) =>
          new Promise(resolve => {
            resolveOther = () => resolve(isCurrent() ? html('C/Other') : null);
          }),
      );
      handler.retarget(startUrlFor('C/Other'));
      handler.retarget(startUrlFor('C/Index'));

      resolveOther();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(handler._currentPath).toBe('C/Index');
      expect(sentEvents(handler, events.NOW_SHOWING).map(m => m.data)).not.toContain('C/Other');
    });

    it('closes a file shown over the article before the new entry has loaded', async () => {
      const { handler, iframe } = makeHandler();
      loadArticleIntoIframe.mockResolvedValueOnce(html('C/Index'));
      await settle(iframe, handler._loadAndAttach('C/Index'));
      loadArticleIntoIframe.mockResolvedValueOnce(svg());
      await settle(iframe, handler._loadAndAttach('C/Pic.svg'));
      loadArticleIntoIframe.mockReturnValueOnce(new Promise(() => {}));

      handler.retarget(startUrlFor('C/Other'));

      expect(document.querySelector('iframe[src="blob:svg"]')).toBeNull();
    });

    it('stops tracking the previous article before the new entry has loaded', async () => {
      const { handler, iframe } = makeHandler();
      loadArticleIntoIframe.mockResolvedValueOnce(html('C/Index'));
      await settle(iframe, handler._loadAndAttach('C/Index'));
      loadArticleIntoIframe.mockReturnValueOnce(new Promise(() => {}));

      handler.retarget(startUrlFor('C/Other'));

      expect(handler.shims.scrollProgress.getProgress()).toBeNull();
    });
  });

  describe('startUrl parsing', () => {
    it('does not double-decode percent-encoded storage/entry from the fragment', async () => {
      let capturedStorage;
      ZimReader.mockImplementation(storageUrl => {
        capturedStorage = storageUrl;
        return { init: jest.fn().mockResolvedValue() };
      });
      loadArticleIntoIframe.mockResolvedValue(html('C/x'));

      const { handler, iframe } = makeHandler();
      const fragment = new URLSearchParams({
        storage: '/zipcontent/abc.zim?baseurl=https://h',
        entry: 'C/C%2B%2B',
        native: 'application/pdf,video/*',
      }).toString();

      await settle(iframe, handler.init(iframe, 'http://app/viewcontent#' + fragment));

      expect(capturedStorage).toBe('/zipcontent/abc.zim?baseurl=https://h');
      expect(loadArticleIntoIframe).toHaveBeenCalledWith(expect.anything(), 'C/C%2B%2B', iframe, {
        nativeTypes: ['application/pdf', 'video/*'],
        isCurrent: expect.any(Function),
      });
    });
  });

  describe('entry resolution', () => {
    it('asks the host to resolve entry paths, and reads what it answers', async () => {
      let resolveBatch;
      ZimReader.mockImplementation((storageUrl, options) => {
        resolveBatch = options.resolveBatch;
        return { init: jest.fn().mockResolvedValue() };
      });
      loadArticleIntoIframe.mockResolvedValue(html('C/Index'));
      const { handler, iframe } = makeHandler();
      const descriptors = { 'C/Index': { clusterNumber: 0, blobNumber: 0 } };
      handler.mediator.request.mockResolvedValue(descriptors);
      const fragment = new URLSearchParams({ storage: 's', entry: 'C/Index' }).toString();
      await settle(iframe, handler.init(iframe, 'http://app/viewcontent#' + fragment));

      await expect(resolveBatch(['C/Index'])).resolves.toBe(descriptors);
      expect(handler.mediator.request).toHaveBeenCalledWith({
        nameSpace: 'sandbox',
        event: events.HANDLER_REQUESTED,
        data: { paths: ['C/Index'] },
      });
    });
  });
});
