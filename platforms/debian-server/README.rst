Kolibri server installer source for Debian
==========================================

This package automates the configuration of a local web server setup to optimize Kolibri for several clients.

It configures and starts Nginx & UWSGI to work together with Kolibri, so caching of static assets is done and use of multicore architecture most servers have is activated when possible.

Overview
--------

This package depends on the main ``kolibri`` Debian package, from versions 0.12 and up.

 * ``kolibri.service``: The system service provided by the ``kolibri`` package is configured such that the built-in web server (HTTP server 'Cherry Py') is disabled. The Kolibri service still runs and is responsible for setting up the initial database, keeping it migrated and for handling all channel downloads as the main background worker daemon. The system service is disabled when installing ``kolibri-server``, but is started by the ``kolibri-server.init`` script.
 * ``kolibri-server.service``: Starts UWSGI workers. Depends on Nginx running. Intentionally does not depend on ``kolibri.service`` as it is disabled.
 * ``kolibri-server.init``: Starts ``kolibri`` and creates 2 dynamic configuration files to include in the configuration of UWSGI workers and Nginx.

Configuration
-------------

You can configure the behavior of the UWSGI workers, by adding ``.ini`` files to ``/etc/kolibri/uwsgi.d/``.

If you can configure the main Nginx site and overwrite defaults by adding ``.conf`` files in to ``/etc/kolibri/nginx.d/``.
