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
