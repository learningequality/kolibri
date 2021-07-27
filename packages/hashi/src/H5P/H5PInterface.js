import BaseShim from '../baseShim';
import { events, nameSpace } from '../hashiBase';

export default class H5P extends BaseShim {
  constructor(mediator) {
    super(mediator);
    this.data = {};
    this.userData = {};
    this.nameSpace = 'H5P';
    // Bind this to ensure that we don't end up with unpredictable this.
    this.__setData = this.__setData.bind(this);
    this.__setUserData = this.__setUserData.bind(this);
    this.loaded = this.loaded.bind(this);
    this.errored = this.errored.bind(this);
    this.on(this.events.STATEUPDATE, this.__setData);
    this.on(this.events.USERDATAUPDATE, this.__setUserData);
  }

  init(iframe, filepath) {
    import(/* webpackChunkName: "H5PRunner" */ './H5PRunner').then(({ default: H5PRunner }) => {
      this.H5PRunner = new H5PRunner(this);
      this.H5PRunner.init(iframe, filepath, this.loaded, this.errored);
    });
  }

  __setData(data = {}) {
    this.data = data;
  }

  __setUserData(userData = {}) {
    this.userData = userData;
  }

  /*
   * Called by Hashi when the iframe is ready
   * This will setup the H5PIntegration property that H5P then uses
   * to configure itself.
   */
  iframeInitialize(contentWindow) {
    this.H5PRunner && this.H5PRunner.shimH5PIntegration(contentWindow);
  }

  loaded() {
    this.__mediator.sendMessage({ nameSpace, event: events.LOADING, data: false });
  }

  errored(err) {
    this.__mediator.sendMessage({ nameSpace, event: events.ERROR, data: err });
  }
}
