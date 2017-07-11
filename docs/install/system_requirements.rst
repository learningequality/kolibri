.. _system_requirements:

System requirements
===================

Operating systems
-----------------

 - Windows Vista, 7, 8.1, 10
 - *(planned)* Linux: Any system with Python 3.4
 - *(planned)* Mac OSX 10.9, 10.10 and 10.11
 - *(planned)* Debian/Raspberry Pi packages: Wheezy or later
 - *(planned)* Ubuntu packages: 14.04, 15.10, 16.04 - anything that's *not* end-of-life.


**Limited support**

``TODO``


Supported Browsers
------------------

 - IE10+, Microsoft Edge
 - Firefox
 - Chrome
 - *(planned)* Safari
 - *(planned)* Epiphany on Raspberry Pi
 - *(planned)* others on Android and  iOS.  


Known issues:

``TODO``


Video playback
--------------

Videos are MP4 encoded. On Ubuntu/Debian systems, install the `Ubuntu restricted extras package <https://apps.ubuntu.com/cat/applications/ubuntu-restricted-extras/>`_.


Hardware requirements
---------------------

``TODO - REVIEW this whole section``

Clients
^^^^^^^

Very old desktops and very low-power computers can be used as client devices to access Kolibri. For instance, some deployments are known to use first-gen Raspberry Pi as desktop computers.

It is always a good idea to do a practical test, but when you want to deploy Kolibri, usually it's not necessary to scale your hardware.

The main concern is that your system needs a video card and driver that can play the videos. Please note that we serve two sets of videos, the individual downloads and the torrent with resized videos -- the latter requires the least from hardware.

Servers
^^^^^^^

Kolibri hardware requirements as a server are next to nothing.

 - 256 MB
 - 500 MHz CPU
 - Hard drive space:
    - ~39GB HDD (full set of English resized videos)
    - ~18GB HDD (Spanish)
    - ~15GB HDD (Portuguese/Brazilian)
    - ~10GB HDD (French)
    - ~265GB (full set of English, non-resized videos + partner contents)

If you have a center with less than 30 computers, a device as simple as a Raspberry Pi is known to work fine as a server.

.. note:: In case you are deploying on Linux and want an efficient setup, use the ``ka-lite-raspberry-pi`` package, it doesn't require a specific architecture, but it's required to use if you deploy on a system with specs equivalent to or smaller than Raspberry Pi.


Getting the videos
------------------

``TODO``
