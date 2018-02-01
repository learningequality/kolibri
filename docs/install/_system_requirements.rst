.. _sys_reqs:

System requirements
===================

Operating systems
-----------------

Servers
^^^^^^^

* Windows

  - Supported: Vista, 7, 8, 10
  - **Not supported: Windows XP** cannot be used to install Kolibri server, but could potentially work as a client device if the browsers are `as up-to-date as possible <https://support.mozilla.org/en-US/questions/1173904>`_.


* MacOS: 10.6+ (install with :ref:`PEX <osx>`)
* Ubuntu: 14.04, 16.04 and up - anything that's *not* end-of-life
* Debian/Raspbian: Jessie or later
* Linux: Any system with Python 2.7
* **Android: not supported**
* **iOS: not supported**

Clients
^^^^^^^
* Windows: IE 11+, Chrome, Firefox
* MacOS: all browsers supported
* Linux: all browsers supported
* Android: 4.2+ 
* iOS: **Safari not supported**, Chrome & Firefox supported


Supported Browsers
------------------

 - IE11+, Microsoft Edge
 - Firefox
 - Chrome
 - *(planned)* Safari
 - *(planned)* Epiphany on Raspberry Pi
 - *(planned)* others on Android and  iOS.  


Video playback
--------------

Videos are MP4 encoded, and require no additional installation of plugins or codecs.


Hardware requirements
---------------------

.. tip:: Below you will find general recommendations regarding hardware requirements. To read more detailed information and find out examples of hardware setups that have been implemented by our partners and users, download the full `Kolibri Hardware Guide <https://learningequality.org/r/hardware-guide>`_ and examples of `Hardware Configurations for Kolibri <https://learningequality.org/r/hardware>`_ (PDF documents).

Servers
^^^^^^^

Minimum hardware requirements to run Kolibri as a server:

 - 500 MB RAM (1 GB recommended)
 - 500 MHz CPU (1 GHz recommended)
 - Hard drive space depends on the size of the content channels you intend to import from `Kolibri Studio <https://studio.learningequality.org/>`_ or a local storage device.

If you have a facility with less than 30 computers, a device as simple as a `Raspberry Pi <https://www.raspberrypi.org/>`_ is known to work fine as a server.

Clients
^^^^^^^

Very old desktops and very low-power computers can be used as client devices to access Kolibri. For instance, some deployments are known to use first-gen Raspberry Pi as desktop computers.

It is always a good idea to do a practical test, but when you want to deploy Kolibri, usually it's not necessary to scale your hardware. The main concern is that your system needs a video card and driver that can play the videos.
