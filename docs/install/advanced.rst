.. _advanced-installation:

Advanced installation options
=============================

.. warning::
  Advanced installation options are not yet available!

.. _pip-installation:

Generic installation (pip install)
----------------------------------

Once Kolibri is released, you may install it as a standard package from PyPi using this command::

    $ pip install kolibri --pre


.. _ppa-installation:

Debian/Ubuntu: Subscribe to updates through a PPA
-------------------------------------------------

``TODO - REVIEW this whole section once PPA is ready``


We maintain a `PPA on Launchpad <https://launchpad.net/~learningequality/+archive/ubuntu/kolibri>`_ and if you are connected to the internet, this will also give you automatic updates.

On Ubuntu, do this::

    sudo apt-get install software-properties-common python-software-properties
    sudo su -c 'echo "deb http://ppa.launchpad.net/learningequality/kolibri" > 
    ...
    sudo apt-get update
    sudo apt-get install kolibri



.. _raspberry-pi-wifi:

Raspberry Pi
------------

``TODO - once RPi deb is ready``