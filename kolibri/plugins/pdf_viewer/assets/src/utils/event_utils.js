/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*
 * This file has been modified to adapt the component to the needs of Kolibri
 * The original file is available at:
 * https://github.com/mozilla/pdf.js/blob/v2.14.305/web/event_utils.js
 */

// Modified: Just the eventBus class is used

/**
 * Simple event bus for an application. Listeners are attached using the `on`
 * and `off` methods. To raise an event, the `dispatch` method shall be used.
 */
class EventBus {
  constructor() {
    this._listeners = Object.create(null);
  }

  /**
   * @param {string} eventName
   * @param {function} listener
   * @param {Object} [options]
   */
  on(eventName, listener, options = null) {
    this._on(eventName, listener, {
      external: true,
      // Modified: Validate options is defined instead of using optional chain operator
      // Original line: 90
      once: options ? options.once : false,
    });
  }

  /**
   * @param {string} eventName
   * @param {function} listener
   * @param {Object} [options]
   */
  off(eventName, listener, options = null) {
    this._off(eventName, listener, {
      external: true,
      // Modified: Validate options is defined instead of using optional chain operator
      // Original line: 102
      once: options ? options.once : false,
    });
  }

  /**
   * @param {string} eventName
   * @param {Object} data
   */
  dispatch(eventName, data) {
    const eventListeners = this._listeners[eventName];
    if (!eventListeners || eventListeners.length === 0) {
      return;
    }
    let externalListeners;
    // Making copy of the listeners array in case if it will be modified
    // during dispatch.
    for (const { listener, external, once } of eventListeners.slice(0)) {
      if (once) {
        this._off(eventName, listener);
      }
      if (external) {
        // Modified: Validate externalListeners is defined instead of using ||= operator
        // Original line: 123
        externalListeners = externalListeners || [];
        externalListeners.push(listener);
        continue;
      }
      listener(data);
    }
    // Dispatch any "external" listeners *after* the internal ones, to give the
    // viewer components time to handle events and update their state first.
    if (externalListeners) {
      for (const listener of externalListeners) {
        listener(data);
      }
      externalListeners = null;
    }
  }

  /**
   * @ignore
   */
  _on(eventName, listener, options = null) {
    // Modified: Validate _listeners[eventName] is defined instead of using ||= operator
    // Original line: 145
    this._listeners[eventName] = this._listeners[eventName] || [];
    const eventListeners = this._listeners[eventName];
    eventListeners.push({
      listener,
      // Modified: Validate options is defined instead of using optional chain operator
      // Original line: 102
      external: options ? options.external === true : false,
      once: options ? options.once === true : false,
    });
  }

  /**
   * @ignore
   */
  _off(eventName, listener) {
    const eventListeners = this._listeners[eventName];
    if (!eventListeners) {
      return;
    }
    for (let i = 0, ii = eventListeners.length; i < ii; i++) {
      if (eventListeners[i].listener === listener) {
        eventListeners.splice(i, 1);
        return;
      }
    }
  }
}

export { EventBus };
