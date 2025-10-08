/**
 * This class offers an API-compatible replacement for localStorage
 * to be used when apps are run in sandbox mode.
 *
 * localStorage is persisted outside the sandboxed iframe in case it is needed for future sessions
 *
 * For more information, see: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
 */
import BaseStorage from './baseStorage';

export default class LocalStorage extends BaseStorage {
  constructor(mediator) {
    super(mediator);
    this.nameSpace = 'localStorage';
    this.__setData = this.__setData.bind(this);
    this.on(this.events.STATEUPDATE, this.__setData);
  }
}
