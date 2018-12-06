Kolibri Hashi: HTML5 App Bridge Library
========================================

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
