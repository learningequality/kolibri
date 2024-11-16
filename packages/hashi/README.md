Kolibri Hashi: HTML5 App Bridge Library
========================================

About
-----

Hashi is a library to allow for mocking of various HTML5 APIs inside a sandboxed iframe. In addition, it leverages the postMessage API to allow for controlled communication and data persistence from inside the sandboxed iframe. This means that HTML5 apps within Kolibri can have persistent state that is backed by the ContentSummaryLog for that particular user.

The inner Hashi mocks the localStorage, sessionStorage, and document.cookie interfaces inside the iframe, allowing HTML5 apps contained therein to access them as if they were not sandboxed, but still safely.

Once this has been setup, it sends a ready event to any external Hashi that may be listening that it is ready. Once it receives a return ready event, it loads up the actual HTML for the page and writes that into the document.

This inner Hashi then communicates with a hashi object external to the iframe that is setup by the HTML5AppRenderer, that then communicates changes in persistent state to be saved into the extraFields object on the ContentSummaryLog.

Getting Started
----------------

Step 1: Install Hashi package deps (run from Kolibri root)

`yarn`

Step 2: Build Kolibri and hashi

`yarn run build`

Custom Navigation: Kolibri Namespace Data Flow
-----------------------------------------------

The purpose of the ``kolibri.js`` extension of our HTML5 API is to allow a sandboxed HTML5 app to safely request the main Kolibri application's data.

External/partner product teams can create HTML5 applications that are fully embeddable within Kolibri and can read Kolibri content data, which they otherwise wouldn't be able to access.

When a user has permissions to access a custom channel, and they click on it in the main learn tab, rather than viewing "normal Kolibri," they will experience a full-screen HTML5 app. One "out-of-the-box" user interaction is the "navigateTo()" function, which opens  a modal that displays a content node. For other data fetching requests, the app, not Kolibri, has the responsibilty of determining what to do with that data.

The HTML5 app uses ``window.kolibri.[function]`` within the app to access the API.

The API is defined in `kolibri.js` and works through a promise chains, to manage async communication, and the postMessageAPI, to facilitate communication between current and parent windows.

The following example will show the complete data flow from the API function, through all of the postMessages, to the data being returned.

Consider an app that is requesting data from a particular content node with
`window.kolibri.getContentById('id12345')`, as defined in `kolibri.js`

```
getContentById(id) {
        return self.mediator.sendMessageAwaitReply({
          event: events.DATAREQUESTED,
          data: { id, dataType: DataTypes.MODEL },
          nameSpace,
        });
      }
```

The messages are managed through the function `sendMessageAwaitReply()` that is defined in `mediator.js`. It is used each time a ``window.kolibri.[function]`` is called, and waits for the data to either be returned or for an error, before resolving and returning data to the original function.

```
  sendMessageAwaitReply({ event, data, nameSpace }) {
    return new Promise((resolve, reject) => {
      const msgId = uuidv4();
      let self = this;
      function handler(message) {
        if (message.message_id === msgId && message.type === 'response') {
          if (message.status == MessageStatuses.SUCCESS) {
            resolve(message.data);
          } else if (message.status === MessageStatuses.FAILURE && message.err) {
            reject(message.err);
          } else {
            // Otherwise something unspecified happened
            reject();
          }
          try {
            self.removeMessageHandler({
              nameSpace,
              event: events.DATARETURNED,
              callback: handler,
            });
          } catch (e) {
            // eslint-disable-next-line no-console
            console.log(e);
          }
        }
      }
      this.registerMessageHandler({
        nameSpace,
        event: events.DATARETURNED,
        callback: handler,
      });
      data.message_id = msgId;
      this.sendMessage({ event, data, nameSpace });
    });
  }
```

`sendMessageAwaitReply()` calls another function that is defined in the mediator, `sendMessage()` which sends a message to the parent window.



In `mainClient.js`, there are listeners registered for all of the core event types for the kolibri HTML5 API: data requested, navigate to, content, and data returned. On the event, the mediator then sends another message, that also contains the namespace, event, and message.

```
    this.on(this.events.DATAREQUESTED, message => {
      let event;
      if (message.dataType === DataTypes.COLLECTION) {
        event = events.COLLECTIONREQUESTED;
      } else if (message.dataType === DataTypes.MODEL) {
        event = events.MODELREQUESTED;
      } else if (message.dataType === DataTypes.SEARCHRESULT) {
        event = events.SEARCHRESULTREQUESTED;
      } else if (message.dataType === DataTypes.KOLIBRIVERSION) {
        event = events.KOLIBRIVERSIONREQUESTED;
      }

      if (event) {
        this.mediator.sendLocalMessage({
          nameSpace,
          event,
          data: message,
        });
      }
    });
```

The listeners for "outgoing" messages are all in `CustomContentRenderer.vue`, the Vue component that renders the full screen view of the HTML5 App and manages requests to the kolibri backend.

```
    this.hashi.on(events.MODELREQUESTED, message => {
    this.fetchContentModel.call(this, message);
    });
```

Here, when the event is omitted, the component uses existing kolibri helper functions like `ContentNodeResource.fetchModel()` to request the data.

```
    fetchContentModel(message) {
    return ContentNodeResource.fetchModel({ id: message.id })
        .then(contentNode => {
        return createReturnMsg({ message, data: contentNode });
        })
        .catch(err => {
        return createReturnMsg({ message, err });
        })
        .then(newMsg => {
        this.hashi.mediator.sendMessage(newMsg);
        });
    },
```

Once there is a response, a return message is created, either with data or with an error, using the `createReturnMsg()` helper function.

```
function createReturnMsg({ message, data, err }) {
    // Infer status from data or err
    const status = data ? MessageStatuses.SUCCESS : MessageStatuses.FAILURE;
    return {
      nameSpace: 'hashi',
      event: events.DATARETURNED,
      data: {
        message_id: message.message_id,
        type: 'response',
        data: data || null,
        err: err || null,
        status,
      },
    };
  }
```

Finally, the same process of postMessages then happens in reverse, with `CustomContentRenderer.vue` sending a message to `mainClient.js`, which in turn sends a message to `mediator.js` which then resolves or rejects the promise that has been pending with `kolibri.getContentById()`.

H5P Static Files
----------------

This code is currently generated from https://github.com/h5p/h5p-php-library

To update, update the `h5pCommit` variable in `downloadH5PVendor.js` to the desired tag and then run `yarn run build-h5p`.


Bloom Reader Static Files
-------------------------

This code is currently generated from https://github.com/learningequality/bloom-player (specifically the 'patched' default branch).

To regenerate, the repository should be cloned, and `yarn run build` run within the context of that repository to regenerate the new assets. All the files put into `dist` should then be copied into `kolibri/core/content/static/bloom` in the Kolibri repository. Any previously existing hash named files can be deleted and replaced by the new hash named files.
