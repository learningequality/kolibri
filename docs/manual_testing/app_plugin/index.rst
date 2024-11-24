Testing Kolibri in app mode
===========================

App mode
--------

Kolibri app mode is designed to provide features and behavior with the mobile app user in mind. In order to test or develop Kolibri in this mode, a browser session can be set to app mode.

When you start the server, you will see a message with a URL pointing to `http://127.0.0.1:8000/app/api/initialize/<some token>` - visiting this URL will set your browser so that it can interact with Kolibri in app mode. **You will only have to do this once unless you clear your browser storage.**
