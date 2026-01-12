/**
 * This class offers an API-compatible replacement for sessionStorage
 * to be used when apps are run in sandbox mode.
 *
 * SessionStorage is not persisted outside the sandboxed iframe.
 *
 * For more information, see: https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage
 */
import BaseStorage from './baseStorage';

export default class SessionStorage extends BaseStorage {
  static shimName = 'sessionStorage';

  // Both directions stubbed, so non-persistence holds here rather than depending on
  // main never having any state to restore.
  __setData() {
    return;
  }

  stateUpdated() {
    return;
  }
}
