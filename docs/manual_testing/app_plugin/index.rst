Testing Kolibri with app plugin enabled
=======================================

The Kolibri app plugin
----------------------

The Kolibri app plugin is designed to provide features and behavior with the mobile app user in mind. In order to test or develop Kolibri in this mode, there are commands that can be used to initialize Kolibri as needed.

By running the command: `yarn app-python-devserver` you will start Kolibri in development mode. You can also run `yarn app-devserver` to run the frontend devserver in parallel.

When you start the server with these commands, you will see a message with a URL pointing to `http://127.0.0.1:8000/app/api/initialize/<some token>` - visiting this URL will set your browser so that it can interact with Kolibri as it runs with the app plugin. **You will only have to do this once unless you clear your browser storage.**
