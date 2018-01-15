.. _support:

Support and Troubleshooting
~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. _forums:

Report a problem with Kolibri
-----------------------------

If you want to contact the **Learning Equality** Support team to report an issue, or share your experience about using Kolibri, please register at our `Community Forums <https://community.learningequality.org/>`_.

Once you register on our forums, please read the the first two pinned topics (*Welcome to LE’s Support Community* and *How do I post to this forum?* ) 

You can add a new topic with the **+ New Topic** button on the right. Make sure to select the **Kolibri** category in the **Create a New Topic** window so it’s easier to classify and respond to.

.. image:: img/community-forums.png
  :alt: add new topic on community forums


Our technical users, including software developers, should follow the instructions on our `Developer documentation <http://kolibri-dev.readthedocs.io/>`_ for reporting bugs.


.. _network:

Troubleshoot Network Issues
---------------------------

#. Can you access Kolibri when you type ``http://127.0.0.1:8080`` in the address bar of the browser?
#. Can you access anything from the :ref:`external IP <access_LAN>` of the device running Kolibri **FROM** the device itself?
#. Can you ping the external IP address from another device on the network? For example, if Kolibri is on a device/computer with IP address ``192.168.0.104``, type this in the Terminal or Command prompt:

  .. code-block:: bash

    ping 192.168.0.104


About IP addresses
******************

* ``0.0.0.0`` = A special IP address on the **server** (your device running Kolibri and "serving" its content to others in the local network), which actually means "all available IP addresses". It's a kind of alias. But accessing ``0.0.0.0`` from another computer doesn't make sense and doesn't work. By default, Kolibri will serve on ``0.0.0.0``, which essentially means all IP addresses that are available on the device will render Kolibri accessible.
* ``127.0.0.1`` = A device's local IP address, meaning "myself". Some people joke and say "There's no place like 127.0.0.1", meaning "there's no place like home" :) This can be used on the serving device itself to test that Kolibri is running, in case you need a failsafe way of checking that Kolibri is in fact running and responsive.
* ``192.x.y.z`` = Addresses starting with ``192`` are local network IP addresses. The same thing can be said about ``10.x.y.z``. The address that you wanna use to enter on the clients/tablets in order to contact the server will in most cases start with ``192`` or ``10``.
* Port number: Kolibri runs on port ``8080``. When you access something on an IP address, you need a port. Ports can be open or closed on the server, but they can also be regulated by firewall rules on the way. ``http://`` <- this is the protocol that the browser reads out from the "URL", which is just some text that describes Kolibri.
* ``http://192.168.1.1:8080`` means: "Connect to IP address ``192.168.1.1`` on port ``8080`` with the HTTP protocol". The browser will the continue to try to reach this address, but may fail for instance if Kolibri isn't running, or if a step along the way blocks access.


Locate Kolibri log files
------------------------

When you report a problem with Kolibri, we may ask you to send us Kolibri **log** files to help us find out why is it not working or crashing. 

Open the ``.kolibri`` folder inside the :ref:`Home <home>` of the device where Kolibri is running and locate these two files:

* ``kolibri.log``
* ``debug.log``


Videos are not playing
----------------------

Make sure to check the :ref:`system requirements <sys_reqs>` to see if you can support video playback. Please report any issues on our `Community Forums <https://community.learningequality.org/>`_, stating the operating system and browser you are using.
