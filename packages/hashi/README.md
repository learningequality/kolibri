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

Running the Code
-----------------

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
