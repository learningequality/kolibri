.. _advanced-installation:

Advanced installation options
=============================

.. warning::
  Advanced installation options are in progress.

.. _pip-installation:

Generic installation (pip install)
----------------------------------

Once Kolibri is released, you may install it as a standard package from PyPi using this command::

    $ pip install kolibri --pre


.. _ppa-installation:

Debian/Ubuntu: Subscribe to updates through a PPA
-------------------------------------------------

We maintain a `PPA on Launchpad <https://launchpad.net/~learningequality/+archive/ubuntu/kolibri>`_ and if you are connected to the internet, this will also give you automatic updates.

On Ubuntu/Debian/Raspbian, do this::

    sudo apt-get install software-properties-common python-software-properties
    sudo add-apt-repository ppa:learningequality/kolibri
    sudo apt-get update
    sudo apt-get install kolibri



.. _raspberry-pi-wifi:

Raspberry Pi
------------

.. note::
  This section is pending instructions for creating a WI-FI hotspot. You can
  install Kolibri on Raspbian following the above instructions for the PPA or
  the `pip install` method.


Nginx configuration
-------------------

.. note::
  This section is pending instructions for NGINX configuration. You can
  install Kolibri on Raspbian following the above instructions for the PPA or
  the `pip install` method. If you are an experienced system administrator or
  Django user, know that it is possible to use Kolibri with for instance
  UWSGI+Nginx, using conventional methods.

