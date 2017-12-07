.. _sys_reqs:

System requirements
===================

Operating systems
-----------------

 - Windows Vista, 7, 8.1, 10
 - Debian/Ubuntu: 14.04, 16.04 and up - anything that's *not* end-of-life.
 - Linux: Any system with Python 2.7
 - Mac OSX 10.9, 10.10 and 10.11
 - Debian/Raspberry Pi packages: Wheezy or later
 - *(planned)* Android: 4.2.2 or later


.. TODO - Limited support

Supported Browsers
------------------

 - IE10+, Microsoft Edge
 - Firefox
 - Chrome
 - *(planned)* Safari
 - *(planned)* Epiphany on Raspberry Pi
 - *(planned)* others on Android and  iOS.  


.. TODO - Known issues


Video playback
--------------

Videos are MP4 encoded, and require no aditional installation of plugins or codecs.


Hardware requirements
---------------------

.. tip:: You can download the full `Kolibri Hardware Guide <https://learningequality.org/r/hardware-guide>`_ and examples of `Hardware Configurations for Kolibri <https://learningequality.org/r/hardware>`_ as PDF documents.

Clients
^^^^^^^

Very old desktops and very low-power computers can be used as client devices to access Kolibri. For instance, some deployments are known to use first-gen Raspberry Pi as desktop computers.

It is always a good idea to do a practical test, but when you want to deploy Kolibri, usually it's not necessary to scale your hardware. The main concern is that your system needs a video card and driver that can play the videos.

Servers
^^^^^^^

Kolibri hardware requirements as a server are next to nothing.

 - 256 MB
 - 500 MHz CPU
 - Hard drive space depends on the size of the content channels you intend to import into Kolibri

If you have a center with less than 30 computers, a device as simple as a Raspberry Pi is known to work fine as a server.

.. TODO - REVIEW with RPi package reqs if necessary

   .. note:: In case you are deploying on Linux and want an efficient setup, use the ``kolibri-raspberry-pi`` package, it doesn't require a specific architecture, but it's required to use if you deploy on a system with specs equivalent to or smaller than Raspberry Pi.