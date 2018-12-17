Hashi Tests
============

It is difficult to test Hashi through unit tests because a proper
test environment needs to have a working iframe sandbox. Until we
can determine a good way to perform automated integration testing, this
directory will contain any files used for unit tests and manual integration tests.

test/kzip (Kolibri Zip Test)
----------
This directory contains the source files for a test HTML5 app
that has been integrated with Kolibri via Hashi. This zip file
gets built automatically when `yarn run build` is called to build
Hashi. Tbe created zip is placed in the `dist` subfolder.

This code can also be used as sample code for seeing a Hello World
example of what HTML5 app Kolibri integration looks like.
