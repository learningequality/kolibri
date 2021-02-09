# Kolibri Hashi: HTML5 App Bridge Library

## About

Hashi is a library to allow for mocking of various HTML5 APIs inside a sandboxed iframe. In addition, it leverages the postMessage API to allow for controlled communication and data persistence from inside the sandboxed iframe. This means that HTML5 apps within Kolibri can have persistent state that is backed by the ContentSummaryLog for that particular user.

The inner Hashi mocks the localStorage, sessionStorage, and document.cookie interfaces inside the iframe, allowing HTML5 apps contained therein to access them as if they were not sandboxed, but still safely.

Once this has been setup, it sends a ready event to any external Hashi that may be listening that it is ready. Once it receives a return ready event, it loads up the actual HTML for the page and writes that into the document.

This inner Hashi then communicates with a hashi object external to the iframe that is setup by the HTML5AppRenderer, that then communicates changes in persistent state to be saved into the extraFields object on the ContentSummaryLog.

## Getting Started

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

## Public API for HTML5 apps on Kolibri

When Kolibri opens an HTML5 app content node, the Kolibri HTML5 renderer loads the index.html file within the `HTML5ZipFile` file associated with the content node. The entry point `index.html` can load other needed assets (js/imgs/css/media) using relative paths, and the Kolibri backend will serve these resources directly from the zip file, unzipping and serving them on the fly.

HTML content is rendered within a sandboxed iframe on the Kolibri platform for security reasons.
The [code](https://github.com/learningequality/kolibri/blob/develop/kolibri/plugins/html5_app_renderer/assets/src/views/Html5AppRendererIndex.vue#L18-L27) that loads the iframe is `<iframe sandbox="allow-scripts" src="host:port/zipcontent/{{md5offile}}.zip/></iframe>`. When the `sandbox` directive applied to iframe, the following limitation apply:
1. No cookies
2. No localStorage
3. ?
4. ?
In order to increase the "out of the box" compatibility more HTML5 content, the Kolibri platform tries to workaround these limitations of sandboxed iframes by providing a `window.localStorage`-like and `document.cookie`-like functionality.

This document, intended for web developers targeting the Kolibri platform, describes the Kolibri platform capabilities and limitations in regards to all HTML5 content rendered within the Kolibri ecosystem.


### Cookies

Stating with Kolibri v0.12, you can now access `document.cookie` as usual from the js code in your HTML5 app. Information will be persisted and accessible next time the HTML5App loads.

Note cookie state is namespaces under `content_id` so your app's "cookie state" will be shared by instances of a content node in cases where a content node with the same source id appears in multiple places within a channel.



### `localStorage`

Stating with Kolibri v0.12, you can also use `localStorage` to save and load values as usual. The information will be persisted and accessible next time the HTML5App loads. Data is persisted namespaces by `content_id`.


### `sessionStorage`

TBD

### HTML Dependencies

You can access the contents of other HTML5Zip files if you know their md5 hash:
- can link to dependencies using host:port/zipcontent/{{md5ofdepfile}}.zip/somefile.js
- or is it now host:port/{{lang}}/zipcontent/{{md5ofdepfile}}.zip/somefile.js  ??


### Content Storage Dependencies

You can access other media files stored in content/storage using:
`host:port/content/storage/{{a/b/abfafafamd5ofmediafile.ext}}`

Note the "direct" access to media files served under `/content/storage/` can be desired for performance reasons (static serve instead of unzipping on the fly in Python code).

Using content storage dependencies is also required for HTML5 Apps that need content streaming of media files, like accessing subset of a .mp3 file or "scrubber" functionality of `<video>` playback. The Kolibri `/zipcontent` endpoint doesn't currently support HTTP range queries.



### Assessment API

Allows HTML5Apps to record exercice-like assessment information.
