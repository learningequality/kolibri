import iFrameView from 'epubjs/src/managers/views/iframe';

class SandboxIFrameView extends iFrameView {
  create() {
    const iframe = super.create();
    iframe.sandbox = 'allow-scripts allow-same-origin';
    return iframe;
  }
}

export default SandboxIFrameView;
