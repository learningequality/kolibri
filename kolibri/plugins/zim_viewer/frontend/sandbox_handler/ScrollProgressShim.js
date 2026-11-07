import SandboxShim from 'kolibri-sandbox/SandboxShim';

export default class ScrollProgressShim extends SandboxShim {
  static shimName = 'scrollProgress';

  constructor(mediator) {
    super(mediator);
    this._progress = null;
    this._detach = null;
    this._suspended = false;
  }

  getProgress() {
    return this._suspended ? null : this._progress;
  }

  suspend() {
    this._suspended = true;
  }

  resume() {
    this._suspended = false;
  }

  track(doc) {
    if (this._detach) {
      this._detach();
      this._detach = null;
    }
    this._suspended = false;
    this._progress = null;
    if (!doc) {
      return;
    }
    this._progress = 0;
    const win = doc.defaultView;
    let frame = null;
    const update = () => {
      frame = null;
      const el = doc.scrollingElement || doc.documentElement;
      const maxScroll = el.scrollHeight - el.clientHeight;
      let progress = 1;
      if (maxScroll > 0) {
        const scrollTop = el.scrollTop + 1 >= maxScroll ? maxScroll : el.scrollTop;
        progress = Math.min(scrollTop / maxScroll, 1);
      }
      if (progress > this._progress) {
        this._progress = progress;
        this.stateUpdated();
      }
    };
    const onScroll = () => {
      if (frame === null && !this._suspended) {
        frame = win.requestAnimationFrame(update);
      }
    };
    win.addEventListener('scroll', onScroll, { passive: true });
    this._detach = () => {
      win.removeEventListener('scroll', onScroll);
      if (frame !== null) {
        win.cancelAnimationFrame(frame);
      }
    };
    update();
  }
}
