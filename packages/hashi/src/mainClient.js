import { ContentNodeResource } from 'kolibri.resources';
import router from 'kolibri.coreVue.router';
import Mediator from './mediator';
import LocalStorage from './localStorage';
import Cookie from './cookie';
import SCORM from './SCORM';
import { events, nameSpace } from './hashiBase';
import Kolibri from './kolibri';

/*
 * This is the main entry point for interacting with the Hashi library.
 * Import this client in order to wrap an iframe that has an instance of
 * the 'SandboxEnvironment' class (found inside iframeClient.js) inside of it.
 * When an iframe has been wrapped, then this class can be initialized to set initial
 * data, and allow the iframe to setup its own environment and start running
 * a contained HTML5 app.
 */
export default class MainClient {
  constructor({ iframe, now } = {}) {
    this.events = events;
    this.iframe = iframe;
    this.mediator = new Mediator(this.iframe.contentWindow);
    this.storage = {
      localStorage: new LocalStorage(this.mediator),
      cookie: new Cookie(this.mediator),
      SCORM: new SCORM(this.mediator),
    };
    this.kolibri = new Kolibri(this.mediator);
    this.now = now;
    this.ready = false;
    this.contentNamespace = null;
    this.startUrl = null;
    this.__setData = this.__setData.bind(this);
  }
  initialize(contentState, userData, startUrl, contentNamespace) {
    /*
     * userData should be an object with the following keys, all optional:
     * userId: <user ID>,
     * userFullName: <user's full name>,
     * progress: <current progress between 0 and 1>,
     * complete: <boolean of whether complete or not>,
     * timeSpent: <time spent in seconds>,
     * language: <language code>,
     */
    this.__setData(contentState, userData);
    this.__setListeners();

    this.contentNamespace = contentNamespace;
    this.startUrl = startUrl;

    // Set this here so that any time the inner frame declares it is ready
    // it can reinitialize its SandboxEnvironment.
    this.on(this.events.IFRAMEREADY, () => {
      this.__setData(this.data, this.userData);
      this.ready = true;
      this.mediator.sendMessage({
        nameSpace,
        event: events.MAINREADY,
        data: {
          contentNamespace,
          startUrl,
        },
      });
    });
    this.mediator.sendMessage({ nameSpace, event: events.READYCHECK, data: true });

    this.on(this.events.DATAREQUESTED, message => {
      this.__fetchContentData(message);
    });

    this.on(this.events.NAVIGATETO, message => {
      this.__navigateTo(message);
    });

    this.on(this.events.CONTEXT, message => {
      this.__getOrUpdateContext(message);
    });
  }

  updateData({ contentState, userData }) {
    // Make a quick copy of the contentState and userData that is passed in.
    // Can do this as all contentState that is coming in should be JSON
    // compatible in the first place, if not, we have other problems.
    if (userData) {
      userData = JSON.parse(JSON.stringify(userData));
      this.userData = userData;
    }
    if (contentState) {
      contentState = JSON.parse(JSON.stringify(contentState));
    }
    Object.keys(this.storage).forEach(key => {
      const storage = this.storage[key];
      if (contentState && contentState[storage.nameSpace]) {
        storage.setData(contentState[storage.nameSpace]);
      }
      if (userData) {
        storage.setUserData(userData);
      }
    });
  }

  getProgress() {
    // Return any calculated progress from the storage APIs
    // So far, only the SCORM shim supports this
    // If no progress has been reported, this will be null.
    return this.storage.SCORM.__calculateProgress();
  }

  __setData(contentState, userData) {
    this.updateData({ contentState, userData });
    if (this.now) {
      this.storage.cookie.setNow(this.now());
    }
  }
  __setListeners() {
    Object.keys(this.storage).forEach(key => {
      const storage = this.storage[key];
      storage.on(events.STATEUPDATE, () => {
        this.mediator.sendLocalMessage({ nameSpace, event: events.STATEUPDATE, data: this.data });
      });
    });
  }

  __fetchContentData(message) {
    // based on the incoming information, get data
    // from Kolibri to pass back to the iframe

    // if filtering by optional params
    if (message.options) {
      let getParams = {};
      let options = message.options;
      if (options.parent && options.parent == 'self') {
        // need to fetch this value when this
        // function is move to a location that has access
        // to `content`
        // getParams.parent = rootNode;
      } else if (options.parent) {
        getParams.parent = options.parent;
      }
      options.ids ? (getParams.ids = options.ids) : null;
      options.page ? (getParams.page = options.page) : null;
      options.pageSize ? (getParams.ids = options.pageSize) : null;
      ContentNodeResource.fetchCollection({ getParams }).then(contentNodes => {
        contentNodes ? (message.status = 'success') : (message.status = 'failure');
        let response = {};
        response.page = message.options.page ? message.options.page : 1;
        response.pageSize = message.options.pageSize ? message.options.pageSize : 50;
        response.results = contentNodes;
        message.data = response;
        message.type = 'response';
        this.mediator.sendMessage({
          nameSpace,
          event: events.DATARETURNED,
          data: message,
        });
      });
    }
    // or, if getting by a specific id
    else if (message.id) {
      let id = message.id;
      ContentNodeResource.fetchModel({ id }).then(contentNode => {
        if (contentNode) {
          message.status = 'success';
        } else {
          message.status = 'failure';
        }
        message.data = contentNode;
        message.type = 'response';
        this.mediator.sendMessage({
          nameSpace,
          event: events.DATARETURNED,
          data: message,
        });
      });
    }
  }

  __navigateTo(message) {
    let id = message.nodeId;
    ContentNodeResource.fetchModel({ id }).then(contentNode => {
      let routeBase, context;
      if (contentNode && contentNode.kind === 'topic') {
        routeBase = '/topics/t';
      } else if (contentNode) {
        routeBase = '/topics/c';
      }
      if (!message.context) {
        // if there is custom context, don't re-route
        const path = `${routeBase}/${id}`;
        router.push({ path: path, query: { context: context } }).catch(() => {});
      }
      this.mediator.sendMessage({
        nameSpace,
        event: events.DATARETURNED,
        data: message,
      });
    });
  }

  __getOrUpdateContext(message) {
    // to update context with the incoming context
    if (message.context) {
      router.push({ query: { context: message.context } }).catch(() => {});
    } else {
      // just return the existing query
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.has('context') ? urlParams.get('context') : null;
    }
  }

  get data() {
    const data = {};
    Object.keys(this.storage).forEach(key => {
      const storage = this.storage[key];
      // Make a quick copy of the data that is being exposed
      // to prevent direct access to the stored data.
      data[storage.nameSpace] = JSON.parse(JSON.stringify(storage.data));
    });
    return data;
  }

  on(event, callback) {
    if (!Object.values(events).includes(event)) {
      throw ReferenceError(`${event} is not a valid event name for ${nameSpace}`);
    }
    this.mediator.registerMessageHandler({ nameSpace, event, callback });
  }

  onStateUpdate(callback) {
    this.on(events.STATEUPDATE, callback);
  }

  onProgressUpdate(callback) {
    this.on(events.PROGRESSUPDATE, callback);
  }
}
