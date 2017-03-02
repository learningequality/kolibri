.. :changelog:

Release Notes
=============

All notable changes to this project will be documented in this file.
This project adheres to `Semantic Versioning <http://semver.org/>`_.

*Don’t let your friends dump git logs into CHANGELOGs™*

`http://keepachangelog.com/ <http://keepachangelog.com/>`_

[0.0.1] - UNRELEASED
--------------------

.. note ::
    Please add new stuff chronologically, we should try chunking up the
    list into components at some point

Added
^^^^^

 - Begin development of core auth app.
 - Add core user types (BaseUser, FacilityUser, DeviceOwner)
 - Add Collections and Roles, implemented using a special tree structure for efficient querying
 - Add authentication & authorization backends
 - Implement permissions for FacilityUsers by checking hierarchy relationships
 - Adds pipelining and integration for building frontend assets with webpack and dynamically serving them in Django.
 - Updates to  - Users, Collections, and Roles, mostly to account for multiple facilities in one database
 - Plugin API with hooks, documented and implemented
 - Adds Django JS Reverse and loads into kolibriGlobal object
 - Creates kolibri.auth API endpoint filtering
 - Adds management plugin for managing learners, classrooms, and groups
 - Automatic inclusion of requirements in a static build
 - Linting of client-side assets during webpack build process

Changed
^^^^^^^

 - Webpack build process now compatible with plugins housed outside the kolibri directory.
 - ES2015 transpilation now uses Bublé instead of Babel.
