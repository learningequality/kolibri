/**
 * This class offers an API-compatible replacement for localStorage and sessionStorage
 * to be used when apps are run in sandbox mode.
 *
 * For more information, see: https://developer.mozilla.org/en-US/docs/Web/API/Storage
 */
import BaseShim from './baseShim';

export default class LocalStorage extends BaseShim {
  constructor(mediator) {
    super(mediator);
    this.events = {
      UPDATE: 'update',
    };
    this.nameSpace = 'localStorage';
    this.webApis = ['localStorage', 'sessionStorage'];
    this.data = {};
    this.setData = this.setData.bind(this);
    this.on(this.events.UPDATE, this.setData);
  }

  iframeInitialize() {
    this.webApis.forEach(webApi => {
      Object.defineProperty(window, webApi, { value: this });
    });
  }

  setData(data = {}) {
    this.data = data;
    this.stateUpdated();
  }

  get length() {
    return Object.keys(this.data).length;
  }

  key(index) {
    return Object.keys(this.data)[index];
  }

  getItem(keyName) {
    return this.data[keyName];
  }

  setItem(keyName, value) {
    this.data[keyName] = value;
    this.stateUpdated();
  }

  removeItem(keyName) {
    delete this.data[keyName];
    this.stateUpdated();
  }

  clear() {
    this.data = {};
    this.stateUpdated();
  }

  stateUpdated() {
    this.sendMessage(this.events.UPDATE, this.data);
  }

  sync() {
    this.stateUpdated();
  }
}
