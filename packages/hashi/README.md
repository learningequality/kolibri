Kolibri Hashi: HTML5 App Bridge Library
========================================

Getting Started
----------------

Step 1: Install Hashi package deps (run from Kolibri root)

`lerna bootstrap`

Step 2: Switch to the Hashi package root dir

`cd packages/hashi`

Step 3: Build Hashi and test HTML5 zip

`yarn run build`

Running the Code
-----------------

*Running the test HTML5 app in Kolibri*
  1. Create a new channel in Studio or edit an existing one
  2. Upload the `dist/localstorage_test.zip` file and publish
  3. Import the published channel into Kolibri
  4. Click on the HTML5 app node you created.
      It should say `TIMES LOADED: 1`.
  5. Click to visit another node, then re-enter the app node.
      It should say `TIMES LOADED: 2`.
  6. You're done! This confirms that Kolibri is saving localStorage data!

*Creating a Hashi client*
  1. Include `hashi.js` in the index.html of the HTML5 app zip
  2. Modify the app to call `hashi.getLocalStorage()` and replace all
     `localStorage` calls to use the storage object returned by
     `hashi.getLocalStorage()`.
