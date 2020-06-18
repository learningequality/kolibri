General Notes
=============

Accessibility (a11y) testing
----------------------------

Inclusive design benefits all users, and we strive to make Kolibri accessible for all. Testing for accessibility can be challenging, but there are a few features you should check for before submitting your PR:

* Working **keyboard navigation** - everything that user can do with mouse or by touch must also work with the `keyboard alone <http://webaim.org/techniques/keyboard/>`__.
* Sufficient `color contrast <http://a11yproject.com/posts/what-is-color-contrast/>`__ between foreground text/elements and the background.
* Meaningful **text alternative** for all non-decorative images, or an empty ``ALT`` attribute in case of decorative ones.
* Meaningful **labels** on ALL `form or button elements <http://accessibility.psu.edu/forms/>`__.
* Page has one main **heading** (H1) and `consecutive lower heading levels <http://accessiblehtmlheadings.com/>`__.


Please also visit the :doc:`/manual_testing/a11y_resources/index` section of the manual testing documentation


Cross-browser and OS testing
----------------------------

It's vital to ensure that our app works across a wide range of browsers and operating systems, particularly older versions of Windows and Android that are common on old and cheap devices.

In particular, we want to ensure that Kolibri runs on major browsers that match any of `the following criteria <http://browserl.ist/?q=%3E+1%25%2C+last+2+versions%2C+ie+%3E%3D+9%2C+Firefox+ESR>`__:

 * within the last two versions
 * IE 11+
 * has at least 1% of global usage stats

Here are some useful options, in order of simplicity:

BrowserStack
~~~~~~~~~~~~

`BrowserStack <https://www.browserstack.com/>`__ is an incredibly useful tool for cross-browser and OS testing. In particular, it's easy to install plugin which forwards ``localhost`` to a VM running on their servers, which in turn is displayed in your browser.

Amazon Workspaces
~~~~~~~~~~~~~~~~~

In some situations, simply having a browser is not enough. For example, a developer may need to test Windows-specific backend or installer code from another OS. In many situations, a virtual machine is appropriate - however these can be slow to download and run.

Amazon's `AWS Workspaces <https://aws.amazon.com/workspaces/>`__ provides a faster alternative. They run Windows VMs in their cloud, and developers can RDP in.

Local Virtual Machines
~~~~~~~~~~~~~~~~~~~~~~

Workspaces is very useful, but it has limitations: only a small range of OSes are available, and connectivity and provisioning are required.

An alternative is to run the guest operating system inside a virtual machine using e.g. `VirtualBox <https://www.virtualbox.org/wiki/Downloads>`__. This also gives more developer flexibility, including e.g. shared directories between the guest and host systems.

There is also a :doc:`/manual_testing/testing_with_vms/index` section, which we hope will help you to use virtual machines.

Hardware
~~~~~~~~

There are some situations where actual hardware is necessary to test the application. This is particularly true when virtualization might prohibit or impede testing features, such as lower-level driver interactions.


Responsiveness to varying screen sizes
--------------------------------------

We want to ensure that the app looks and behaves reasonably across a wide range of typical screen sizes, from small tablets to large, HD monitors. It is highly recommended to constantly be testing functionality at a range of sizes.

Chrome and Firefox's Developer Tools both have some excellent functionality to simulate arbitrary screen resolutions.


Slow network connections
------------------------

It's important to simulate end-users network conditions. This will help identify real-world performance issues that may not be apparent on local development machines.

Chrome's Developer Tools have functionality to simulate a variety of network connections, including Edge, 3G, and even offline. An app can be loaded into multiple tabs, each with its own custom network connectivity profile. This will not affect traffic to other tabs.

Within the Chrome Dev Tools, navigate to the Network panel. Select a connection from the drop-down to apply network throttling and latency manipulation. When a Throttle is enabled the panel indicator will show a warning icon. This is to remind you that throttling is enabled when you are in other panels.

For Kolibri, our target audience's network condition can be mimicked by setting connectivity to Regular 3G (100ms, 750kb/s, 250 kb/s).


Performance testing with Django Debug Panel
-------------------------------------------

We have built in support for Django Debug Panel (a Chrome extension that allows tracking of AJAX requests to Django).

To use this, ensure that you have development dependencies installed, and install the `Django Debug Panel Chrome Extension <https://chrome.google.com/webstore/detail/django-debug-panel/nbiajhhibgfgkjegbnflpdccejocmbbn>`__. You can then run the development or production servers with the following environment variable set::

  DJANGO_SETTINGS_MODULE=kolibri.deployment.default.settings.debug_panel

This will activate the debug panel, and will display in the Dev tools panel of Chrome. This panel will track all page loads and API requests. However, all data bootstrapping into the template will be disabled, as our data bootstrapping prevents the page load request from being profiled, and also does not profile the bootstrapped API requests.


Generating user data
--------------------

For manual testing, it is sometimes helpful to have generated user data, particularly for Coach and Admin facing functionality.

In order to do this, a management command is available

.. code-block:: bash

    kolibri manage generateuserdata

This will generate user data for each channel on the system.  To see available options, use

.. code-block:: bash

    kolibri manage help generateuserdata


Examples for Kolibri with imported channels
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The command ``kolibri manage generateuserdata`` (without any arguments) creates 1 facility, with 2 classes, and 20 users each class.  It will then create sample data up to maximum of 2 channels. Then it will create 5 lessons per class, 2 exams, and randomize the number of interactions per channel for learners.

Create 2 facilities, with 2 classes per facility, with 20 learners per class.

.. code-block:: bash

    kolibri manage generateuserdata --facilities 2 --classes 2 --users 20

Same as above, but prepend their names with "VM1" - useful for testing P2P syncing features.

.. code-block:: bash

    kolibri manage generateuserdata --facilities 2 --classes 2 --users 20 --device-name VM1

Create 2 facilities, with 2 classes per facility, with 20 learners per class, 2 interactions per learner.

.. code-block:: bash

    kolibri manage generateuserdata --facilities 2 --classes 2 --users 20 --num-content-items 2


Examples for a fresh Kolibri install (no imported channels)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

For a fresh Kolibri installation, use this to automatically create superusers and skip on-boarding (setup wizard).  The superuser username is ``superuser`` and password is ``password``.

.. code-block:: bash

    kolibri manage generateuserdata --no-onboarding

Create 2 facilities, with 2 classes per facility, with 20 learners per class.

.. code-block:: bash

    kolibri manage generateuserdata --facilities 2 --classes 2 --users 20 --no-onboarding


Notes
~~~~~

1. If there are existing facilities, it will only create the remaining ones.  So if you already have one facility, specifying ``--facilities 2`` will create one more facility and its subsequent sample data.

2. Use the `--max-channels` option to limit the number of channels for learners to interact with.  This saves a lot of time specially on large data samples.

3. The ``--no-onboarding`` argument creates a super user for each facility with username ``superuser`` and password ``password``.


Collecting client and server errors using Sentry
------------------------------------------------

`Sentry <https://docs.sentry.io/>`__ clients are available for both backend and frontend error reporting. This can be particularly useful to have running on beta and demo servers in order to catch errors "in the wild".

This behaviour is activated by installing the `Kolibri Sentry Plugin <https://github.com/learningequality/kolibri-sentry-plugin>`__. Once installed, the options below become available for configuration.

.. code-block:: bash

    pip install kolibri-sentry-plugin  # might need to run with sudo

If you're running Kolibri using a pex file, you'll need to make sure that the pex inherits a Python path with `kolibri_sentry_plugin` available. To do this without inheriting the full system path, run the pex from an active virtual environment with `PEX_INHERIT_PATH=1 python kolibri.pex`.

To set up error reporting, you'll need a `Sentry DSN <https://docs.sentry.io/error-reporting/quickstart>`__. These are available from your project settings at ``https://sentry.io/settings/[org_name]/[project_name]/keys/``

You can set these either in options.ini or as environment variables.

If using options.ini, under a ``Debug`` header you can use these options:

 * ``SENTRY_BACKEND_DSN``
 * ``SENTRY_FRONTEND_DSN``
 * ``SENTRY_ENVIRONMENT`` (optional)

Or if using environment variables:

 * ``KOLIBRI_DEBUG_SENTRY_BACKEND_DSN``
 * ``KOLIBRI_DEBUG_SENTRY_FRONTEND_DSN``
 * ``KOLIBRI_DEBUG_SENTRY_ENVIRONMENT`` (optional)

The 'environment' corresponds to a particular installation of Kolibri that we want to track over time - for example, ``demo-server``, ``beta-server``, or ``i18n-server``.

Other information is provided automatically such as the current user, browser info, and locale.
