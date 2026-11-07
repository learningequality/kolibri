import SandboxHandler from 'kolibri-sandbox/SandboxHandler';
import { events, nameSpace } from 'kolibri-sandbox/base';
import { ZimReader } from './reader';
import { EntryKinds, loadArticleIntoIframe } from './articleLoader';
import { attachNavigationInterceptor, scrollToFragment } from './navigationInterceptor';
import { attachLinkRewriter } from './linkRewriter';
import ScrollProgressShim from './ScrollProgressShim';

function parseStartUrl(startUrl) {
  const [permalinkUrl, fragment = ''] = startUrl.split('#');
  const params = new URLSearchParams(fragment);
  const native = params.get('native');
  return {
    permalinkUrl,
    storageUrl: params.get('storage') || '',
    entry: params.get('entry') || '',
    rootId: params.get('rootId') || null,
    nativeTypes: native ? native.split(',') : [],
  };
}

export default class ZimHandler extends SandboxHandler {
  static shims = [ScrollProgressShim];

  constructor(sandbox) {
    super(sandbox);
    this._generation = 0;
    this._showingFile = false;
    this._articlePath = null;
    this._nativeTypes = [];
  }

  async init(iframe, startUrl) {
    const { permalinkUrl, storageUrl, entry, rootId, nativeTypes } = parseStartUrl(startUrl);
    this._iframe = iframe;
    this._rootId = rootId;
    this._nativeTypes = nativeTypes;
    this._permalinkBase = permalinkUrl;
    this._reader = new ZimReader(storageUrl, {
      resolveBatch: paths => this.requestFromHost({ paths }),
    });
    await this._reader.init();
    await this._loadAndAttach(entry);
  }

  retarget(startUrl) {
    const { entry: target } = parseStartUrl(startUrl);
    if (!target || target === this._currentPath) {
      return;
    }
    if (target === this._articlePath) {
      this._generation++;
      this._renderFile(null);
      this.closeFile();
      return;
    }
    this.shims[ScrollProgressShim.shimName].suspend();
    this._renderFile(null);
    this._closeOverlay();
    this._navigate(target);
  }

  _navigate(path, fragment) {
    this._loadAndAttach(path, fragment).catch(error => {
      this.mediator.sendMessage({
        nameSpace,
        event: events.ERROR,
        data: { message: error.message, error: 'LOADING_ERROR' },
      });
    });
  }

  _revoke(urls) {
    for (const url of urls || []) {
      URL.revokeObjectURL(url);
    }
  }

  _openFile({ url }) {
    if (this._fileFrame) {
      this._revoke([this._fileUrl]);
    } else {
      this._fileFrame = document.createElement('iframe');
      Object.assign(this._fileFrame.style, {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        border: 0,
        background: 'white',
      });
      this._iframe.parentNode.appendChild(this._fileFrame);
      this.mediator.sendMessage({ nameSpace, event: events.FILE_OVERLAY, data: true });
    }
    this._fileUrl = url;
    this._fileFrame.src = url;
  }

  _closeOverlay() {
    if (!this._fileFrame) {
      return;
    }
    this._fileFrame.remove();
    this._fileFrame = null;
    this._revoke([this._fileUrl]);
    this._fileUrl = null;
    this.mediator.sendMessage({ nameSpace, event: events.FILE_OVERLAY, data: false });
  }

  closeFile() {
    this._closeOverlay();
    if (this._articlePath == null) {
      return;
    }
    this._currentPath = this._articlePath;
    this._articlePath = null;
    this._showingFile = false;
    this.shims[ScrollProgressShim.shimName].resume();
  }

  _reportShowing(canonicalPath) {
    this._currentPath = canonicalPath;
    if (canonicalPath !== undefined) {
      this.mediator.sendMessage({ nameSpace, event: events.NOW_SHOWING, data: canonicalPath });
    }
  }

  _renderFile(file) {
    if (file || this._showingFile) {
      this.mediator.sendMessage({ nameSpace, event: events.RENDER_FILE, data: file });
    }
    this._showingFile = Boolean(file);
  }

  async _loadAndAttach(path, fragment = '') {
    const generation = ++this._generation;
    const isCurrent = () => generation === this._generation;
    const result = await loadArticleIntoIframe(this._reader, path, this._iframe, {
      nativeTypes: this._nativeTypes,
      isCurrent,
    });
    if (!result) {
      return;
    }
    const { kind, basePath: canonicalPath, objectUrls, file } = result;
    if (kind === EntryKinds.FILE) {
      this._openFile(file);
      return;
    }
    if (kind === EntryKinds.NATIVE) {
      const isImage = file.mimetype.startsWith('image/');
      if (!isImage) {
        this._closeOverlay();
        this.shims[ScrollProgressShim.shimName].suspend();
        if (this._articlePath == null) {
          this._articlePath = this._currentPath;
        }
        this._reportShowing(canonicalPath);
      }
      const previous = isImage ? this._currentPath : this._articlePath;
      this._renderFile({ ...file, hasPrevious: previous != null });
      return;
    }
    this._closeOverlay();
    this._articlePath = null;
    if (this._detachInterceptor) this._detachInterceptor();
    this._detachInterceptor = null;
    if (this._detachRewriter) this._detachRewriter();
    this._detachRewriter = null;
    this.shims[ScrollProgressShim.shimName].track(null);
    const previousObjectUrls = this._objectUrls;
    this._objectUrls = objectUrls;
    this._revoke(previousObjectUrls);
    this._reportShowing(canonicalPath);
    this._renderFile(null);
    await new Promise(resolve => {
      const onLoad = () => {
        this._iframe.removeEventListener('load', onLoad);
        resolve();
      };
      this._iframe.addEventListener('load', onLoad);
    });
    const newDoc = this._iframe.contentDocument;
    if (!isCurrent() || !newDoc) return;
    this._detachInterceptor = attachNavigationInterceptor(
      newDoc,
      canonicalPath,
      (newPath, newFragment) => this._navigate(newPath, newFragment),
    );
    if (this._rootId) {
      this._detachRewriter = attachLinkRewriter(newDoc, canonicalPath, {
        rootId: this._rootId,
        permalinkBase: this._permalinkBase,
        resolve: paths => this._reader.resolveBatch(paths),
      });
    }
    scrollToFragment(newDoc, fragment);
    this.shims[ScrollProgressShim.shimName].track(newDoc);
  }
}
