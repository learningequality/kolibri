import iFrameView from 'epubjs/src/managers/views/iframe';

class SandboxIFrameView extends iFrameView {
  create() {
    const iframe = super.create();
    iframe.sandbox = 'allow-scripts allow-same-origin';
    return iframe;
  }

  getContents() {
    return this.contents;
  }

  focus() {
    if (this.iframe) {
      this.iframe.focus();
    }
  }

  expand(force) {
    if (this.contents && this.layout.props.flow === 'scrolled') {
      const textWidth = this.contents.textWidth();
      const scrollWidth = this.contents.scrollWidth();

      // Set locked width to the best guess of content width, which sizes the iframe and it's
      // container. This is one of many pieces preventing a horizontal scroll bar
      if (textWidth !== scrollWidth && scrollWidth > 0) {
        this.lockedWidth = textWidth;
      }
    }

    return super.expand(force);
  }
}

export default SandboxIFrameView;
