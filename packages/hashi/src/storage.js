/**
* This class offers an API-compatible replacement for localStorage and sessionStorage
* to be used when apps are run in sandbox mode.
*
* For more information, see: https://developer.mozilla.org/en-US/docs/Web/API/Storage
*/
class Storage {
    constructor() {
        // This copy of the data does not persist, and is simply used to speed up
        // and allow for synchronous access to data. We need to ensure that this
        // data is populated from Kolibri before handing this off to apps if possible.
        this.sessionData = {};

        // keys have list ordering, so we use a list to ensure order is not changed.
        // Per the spec, key ordering is defined by user agent, so we don't have to
        // model any specific sorting behavior, just be consistent.
        this.sessionKeys = [];
        this.initMessageSent = false;
        this.dataReceived = false;
    }

    _sendMessage(name, data) {
        var message = {
            'action': name,
            'params': data
        };
        console.log("Sending message to parent: " + JSON.stringify(message));
        window.parent.postMessage(JSON.stringify(message), '*');
    }

    initData() {
      const timeout = 5000;
      let initDataPromise = null;
      if (!this.initMessageSent) {
        initDataPromise = new Promise((resolve, reject) => {
            function parentMessageReceived(event) {
              if (this.timer) {
                clearTimeout(this.timer);
              }
              const message = JSON.parse(event.data);
              if (message.action === 'kolibriDataLoaded') {
                this.sessionData = message.params['data'];
                this.sessionKeys = Object.keys(this.sessionData);
                this.dataReceived = true;
                resolve(this);
              }
            }
            parentMessageReceived = parentMessageReceived.bind(this);

            function timedOut() {
                reject("Load timed out.");
            }

            window.addEventListener('message', parentMessageReceived);
            this._sendMessage('hashiInitialized', {});
            this.timer = setTimeout(timedOut, timeout);
        });

        this.initMessageSent = true;
      }
      return initDataPromise;
    }

    get length() {
        return this.sessionKeys.length;
    }

    key(index) {
        return this.sessionKeys[index];
    }

    getItem(keyName) {
        // TODO: Evaluate the performance implications of using postMessage and waiting for value
        return this.sessionData[keyName];
    }

    setItem(keyName, value) {
        console.log("setItem called");
        if (this.sessionKeys.indexOf(keyName) === -1) {
            this.sessionKeys.push(keyName);
        }
        this.sessionData[keyName] = value
        this._sendMessage('stateUpdated', this.sessionData);
    }

    removeItem(keyName) {
        delete this.sessionData[keyName];

        var keyIndex = this.sessionKeys.indexOf(keyName);
        if (keyIndex != -1) {
            this.sessionKeys.splice(keyIndex, 1);
        }
        this._sendMessage('stateUpdated', this.sessionData);
    }

    clear() {
        this.sessionKeys = [];
        this.sessionData = {};

        this._sendMessage('stateUpdated', this.sessionData);
    }
}

export const getLocalStorage = () => {
    // even referencing localStorage can throw a SecurityError, so don't assign to localStorage by default here.
    let storage = null;
    try {
        // while some browsers throw immediately when trying to access localStorage, others only throw when
        // you try to write to it, so we use a write test as the canonical way of testing if it works
        const key = "testing_that_local_storage_is_allowed_using_a_key_that_would_never_actually_be_used";
        localStorage.setItem(key, "It works!");
        localStorage.removeItem(key);
        storage = localStorage;
        // we need to make this a promise as well for API consistency since we need a promise for Hashi storage.
        const storagePromise = new Promise((resolve, reject) => {resolve(storage)});
        return storagePromise;
    } catch (e) {
        if (e.name === 'SecurityError') {
            console.log("Running in sandboxed iFrame, setting localStorage to Hashi.Storage instance.");
            storage = new Storage();
            return storage.initData();
        } else {
            throw e;
        }
    }
    return storage;
}
