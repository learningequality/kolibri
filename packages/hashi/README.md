# Kolibri Hashi: HTML5 App Bridge Library

## What is Hashi?

Hashi is a library that allows you to inject various HTML5 and Kolibri APIs, within inside a sandboxed iframe, such as the Kolibri `HTML5AppRenderer`. With Hashi you can write HTML5 apps for Kolibri that are able to:

- Safely "use" browser storage APIs like `document.cookies`, `localStorage`, `indexedDB` and `sessionStorage` for general data persistence needs.
- Access a [SCORM 1.2 compliant](https://scorm.com/scorm-explained/technical-scorm/scorm-12-overview-for-developers/) logging interface for detailed progress tracking.
- Initiate navigation to other URLs within Kolibri, such as other content items within the same channel or topic.
- Present Kolibri content in a custom UI distinct from the Kolibri's default interface.

Communication between an HTML5 app and Kolibri is accomplished by leveraging the [postMessage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage), which allows for controlled communication and data persistence from inside the sandboxed iframe. Moreover, with the exception of `indexedDB`, nothing is written to the actual application storage. Cookies, localStorage, and SCORM data are saved to the Kolibri backend through the `ContentSummaryLog` model.

Additionally, content creators can write HTML5 apps that tightly integrate with Kolibri through the `window.kolibri` object, which provides functions that can access content metadata, render arbitrary content within the iframe, and trigger navigation events in the main Kolibri app. This integration can be used for something as simple as creating hyperlinks between content nodes in Kolibri to creating a custom interface for navigating and viewing a channel.

## About the name

"Hashi" (はし) is a Japanese word meaning "bridge" or "chopsticks", which is a metaphor for how this library has one chopstick in the iframe, while the other is in the parent Kolibri application, thus creating a bridge between the two environments. In these docs we will often refer to the collection of injected APIs in either environment as a "Hashi" (e.g. "...the iframe Hashi will then send a message to the Kolibri Hashi").

## Using the browser storage APIs

The iframe Hashi provides mocked versions of core browser storage APIs:

- cookies
- localStorage
- indexedDB
- sessionStorage

You can use them as you normally would with any web application.

```jsx
// Add something to localStorage
window.localStorage.setItem('totalPoints', 50);

// Write a cookie
window.document.cookie = 'myname=kolibri';
```

When this code is run in the HTML5 app, it does not actually modify the application storage directly. Instead, the iframe Hashi will send a message out to the Kolibri Hashi that the mocked storage object has changed. When that message is received on the Kolibri side, it will then send an HTTP request to the backend to synchronize that change in the database in app's `ContentSummaryLog` model.

This means that if the user leaves the HTML5 app in Kolibri and comes back later, all of these storage objects (except for sessionStorage) will be restored from what was previously saved to the database, mimicking the behavior of these APIs in a non-iframe context.

**Note that this stored data is associated with the content ID of the HTML 5 app, and not its content node ID** (one content ID can be associated with many content nodes). Thus, any kind of state or progressed recorded for the HTML 5 app will be shared across all content nodes associated with it.

## Using the SCORM 1.2 API

[SCORM](http://www.scorm.com) is a specification for writing web applications so that they are interoperable with different learning management systems (LMS). This lets content written for other LMSs work in Kolibri without any modification.

The iframe Hashi can access a `window.parent.SCORM` object that fully implements the SCORM 1.2 specification ([API reference](https://scorm.com/scorm-explained/technical-scorm/run-time/run-time-reference/#section-2)).

```jsx
// Get the name of the student
var name = window.parent.SCORM.LMSGetValue('student_name');

// Set the score for the assessment
window.parent.SCORM.LMSSetValue('score.raw', 0.8);
```

Like the web storage APIs, whenever your app communicates to Kolibri via the SCORM interface, it triggers a network call to the backend to either save or retrieve within the app's associated `ContentSummaryLog` model.

**Note that HTML5 apps using SCORM will not work with Kolibri versions before 0.15.** If you have control over the HTML5 source code, you will need to check to see if the `window.parent.SCORM` object is defined before making any calls to it, otherwise the app may crash.

## Using the Kolibri API

The iframe Hashi has access to another special global `window.kolibri` object that lets HTML5 app creators tightly integrate their creations with the Kolibri platform.

### Querying the ContentNode API for resource metadata and availability

TBD

### Using the "render" intent to display arbitrary content with the app

TBD

### Using the "navigate to" intent to control navigation within Kolibri

TBD

## How it works

Once this has been setup, it sends a ready event to any external Hashi that may be listening that it is ready. Once it receives a return ready event, it loads up the actual HTML for the page and writes that into the document.

This inner Hashi then communicates with a hashi object external to the iframe that is setup by the HTML5AppRenderer, that then communicates changes in persistent state to be saved into the extraFields object on the ContentSummaryLog.

## Public API for HTML5 apps on Kolibri

When Kolibri opens an HTML5 app content node, the Kolibri `HTML5Renderer` loads the index.html file within the `HTML5ZipFile` file associated with the content node. The entry point `index.html` can load other needed assets (js/imgs/css/media) using relative paths, and the Kolibri backend will serve these resources directly from the zip file, unzipping and serving them on the fly.

HTML content is rendered within a sandboxed iframe on the Kolibri platform for security reasons.
The [code](https://github.com/learningequality/kolibri/blob/develop/kolibri/plugins/html5_app_renderer/assets/src/views/Html5AppRendererIndex.vue#L18-L27) that loads the iframe is `<iframe sandbox="allow-scripts" src="host:port/zipcontent/{{md5offile}}.zip/></iframe>`. When the `sandbox` directive applied to iframe, the following limitation apply:

1. No cookies
2. No localStorage

In order to increase the "out of the box" compatibility more HTML5 content, the Kolibri platform tries to work around these limitations of sandboxed iframes by providing a `window.localStorage`-like and `document.cookie`-like functionality.

This document, intended for web developers targeting the Kolibri platform, describes the Kolibri platform capabilities and limitations in regards to all HTML5 content rendered within the Kolibri ecosystem.

### HTML Dependencies

You can access the contents of other HTML5Zip files if you know their md5 hash:

- can link to dependencies using host:port/zipcontent/{{md5ofdepfile}}.zip/somefile.js
- or is it now host:port/{{lang}}/zipcontent/{{md5ofdepfile}}.zip/somefile.js ??

### Content Storage Dependencies

You can access other media files stored in content/storage using:
`host:port/content/storage/{{a/b/abfafafamd5ofmediafile.ext}}`

Note the "direct" access to media files served under `/content/storage/` can be desired for performance reasons (static serve instead of unzipping on the fly in Python code).

Using content storage dependencies is also required for HTML5 Apps that need content streaming of media files, like accessing subset of a .mp3 file or "scrubber" functionality of `<video>` playback. The Kolibri `/zipcontent` endpoint doesn't currently support HTTP range queries.

### Assessment API

Allows HTML5Apps to record exercice-like assessment information.

## Developing on Hashi

Step 1: Install Hashi package deps (run from Kolibri root)

```
yarn
```

Step 2: Build Kolibri and hashi

```
yarn run build
```

## Running the Code

*Running the test HTML5 app in Kolibri*

1. Create a new channel in Studio or edit an existing one
2. Create a test zip file by running `scripts/make_test_zip.py`
3. Upload the `localstorage_test.zip` file and publish
4. Import the published channel into Kolibri
5. Click on the HTML5 app node you created.
It should say `TIMES LOADED: 1`.
6. Click to visit another node, then re-enter the app node.
It should say `TIMES LOADED: 2`.
And `Last visit:` with the previous date and time you looked at it
7. You're done! This confirms that Kolibri is saving localStorage and cookie data!
