/**
 * This class offers an API-compatible replacement for sessionStorage
 * to be used when apps are run in sandbox mode.
 *
 * sessionStorage is not persisted outside the sandboxed iframe
 *
 * For more information, see: https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage
 */
import BaseStorage from './baseStorage';

export default class SessionStorage extends BaseStorage {
  constructor(mediator) {
    super(mediator);
    this.nameSpace = 'sessionStorage';
  }
  // Override the default implementation of stateUpdated to prevent unnecessarily messages
  // However, as nothing is listening for this in the main client, it wouldn't actually
  // hurt if this was still transmitting.
  stateUpdated() {
    return;
  }
}
