import BaseShim from '../baseShim';
import { events, nameSpace } from '../hashiBase';

export default class Bloom extends BaseShim {
  constructor(mediator) {
    super(mediator);
    this.data = {};
    this.userData = {};
    this.nameSpace = 'Bloom';
    // Bind this to ensure that we don't end up with unpredictable this.
    this.__setData = this.__setData.bind(this);
    this.__setUserData = this.__setUserData.bind(this);
    this.loaded = this.loaded.bind(this);
    this.errored = this.errored.bind(this);
    this.on(this.events.STATEUPDATE, this.__setData);
    this.on(this.events.USERDATAUPDATE, this.__setUserData);
  }

  init(iframe, filepath) {
    import(/* webpackChunkName: "BloomRunner" */ './BloomRunner').then(
      ({ default: BloomRunner }) => {
        this.BloomRunner = new BloomRunner(this);
        this.BloomRunner.init(iframe, filepath, this.loaded, this.errored);
      },
    );
  }

  __setData(data = {}) {
    this.data = data;
  }

  __setUserData(userData = {}) {
    this.userData = userData;
  }

  /*
   * Called by Hashi when the iframe is ready
   * This will setup the BloomIntegration property that Bloom then uses
   * to configure itself.
   */
  iframeInitialize(contentWindow) {
    this.BloomRunner && this.BloomRunner.shimBloomIntegration(contentWindow);
  }

  loaded() {
    this.__mediator.sendMessage({ nameSpace, event: events.LOADING, data: false });
  }

  errored(err) {
    this.__mediator.sendMessage({ nameSpace, event: events.ERROR, data: err });
  }
}
