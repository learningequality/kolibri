Frequently Asked Questions
==========================


How much does Kolibri cost to install?
--------------------------------------

It is FREE – both free as in “free speech” and free as in “free beer”! To learn more about free software, see this `Free Software Foundation article <http://www.fsf.org/about/what-is-free-software>`_.

Something isn’t working - does Kolibri have log files?
------------------------------------------------------

It’s very important to get more technical information if Kolibri is not working or crashing. Have a look at ``~/.kolibri`` folder (``C:\Documents and Settings\<username>\.kolibri`` on Windows), where you will find the log files which Kolibri writes to while it’s running. 


How do I report a problem?
--------------------------

Refer to our :ref:`Community Forum <get_support_ref>` to report an issue and receive support.  Our technical users, including software developers should follow the instructions on our `Developer documentation <http://kolibri-dev.readthedocs.io/>`_ for reporting bugs.

Why are my downloaded videos not displaying?
--------------------------------------------

Make sure to check the :ref:`system requirements <sys_reqs>` to see if you can support video playback. Please report any issues on our :ref:`Community Forum <get_support_ref>`.

Bulk Downloads of Content Channels
----------------------------------

``Coming soon!``

At this time we do not support bulk downloads of content channel outside the Kolibri platform.  In the near future, we will consider offering bit torrents for certain global content channels.

How can I import a content channel without a reliable internet connection?
--------------------------------------------------------------------------

You can import a content channel from attached USB after you’ve initially downloaded the content channel from the internet. Content channels can be copied and carried forward to servers you want to import the content channel to.








Network Terminology
-------------------

About IP addresses
~~~~~~~~~~~~~~~~~~

* ``0.0.0.0`` = A special IP address on the **server** (your device running Kolibri and "serving" its content to others in the local network), which actually means "all available IP addresses". It's a kind of alias. But accessing ``0.0.0.0`` from another computer doesn't make sense and doesn't work. By default, Kolibri will serve on ``0.0.0.0``, which essentially means all IP addresses that are available on the device will render Kolibri accessible.
* ``127.0.0.1`` = A device's local IP address, meaning "myself". Some people joke and say "There's no place like 127.0.0.1", meaning "there's no place like home" :) This can be used on the serving device itself to test that Kolibri is running, in case you need a failsafe way of checking that Kolibri is in fact running and responsive.
* ``192.x.y.z`` = Addresses starting with ``192`` are local network IP addresses. The same thing can be said about ``10.x.y.z``. The address that you wanna use to enter on the clients/tablets in order to contact the server will in most cases start with ``192`` or ``10``.
* Port number: Kolibri runs on port ``8080``. When you access something on an IP address, you need a port. Ports can be open or closed on the server, but they can also be regulated by firewall rules on the way. ``http://`` <- this is the protocol that the browser reads out from the "URL", which is just some text that describes Kolibri.
* ``http://192.168.1.1:8080`` means: "Connect to IP address ``192.168.1.1`` on port ``8080`` with the HTTP protocol". The browser will the continue to try to reach this address, but may fail for instance if Kolibri isn't running, or if a step along the way blocks access.


Troubleshoot Network Problems
-----------------------------

#. Can you access Kolibri via ``http://127.0.0.1:8080``?
#. Can you access anything from the external IP of the device running Kolibri **FROM** the device itself?
#. Can you ping the external IP address from another device on the network?






Working with Kolibri from the Command Line
------------------------------------------

.. warning::
  In Windows you need to open ``cmd.exe`` Command prompt in the folder where Kolibri executable is located: ``c:/Python27/Scripts``.

If you see errors in the prompt/terminal output while running the commands below, ask for help at our `Community Forums <https://community.learningequality.org/>`_, or `file an issue on GitHub <https://github.com/learningequality/kolibri/issues/new>`_.


Start/Stop Kolibri
~~~~~~~~~~~~~~~~~~

In case you need to troubleshoot potential problems while running Kolibri, you may try to start it manually from the command line.

.. code-block:: bash

  kolibri start --debug --foreground


.. code-block:: bash

  kolibri stop


Import Content Channels from Internet
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

To import content channels from Internet, run these two commands in sequence. The first downloads the channel database, and the second downloads the resources (videos, documents, etc.). *Make sure not to include the angle brackets “< >” in the command.*

.. code-block:: bash

  kolibri manage importchannel -- network <Channel ID>
  kolibri manage importcontent -- network <Channel ID>


Import Content Channels from a Local Drive
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

To import content channels from the local drive, run these two commands in sequence. Local drive should have a folder ``KOLIBRI_DATA`` at the root, with Kolibri ``content`` inside.

.. code-block:: bash

  kolibri manage importchannel -- local <Channel ID> /path/to/local/drive
  kolibri manage importcontent -- local <Channel ID> /path/to/local/drive


Export Content Channels
~~~~~~~~~~~~~~~~~~~~~~~

To export Kolibri content channels on a local drive in order to share it with another device, run these two commands in sequence. The first exports the channel database, and the second exports the resources (videos, documents, etc.). 

.. code-block:: bash

  kolibri manage exportchannel -- <Channel ID> /path/to/local/drive/KOLIBRI_DATA 
  kolibri manage exportcontent -- <Channel ID> /mount/mydrive/KOLIBRI_DATA 

The path should be to a folder named ``KOLIBRI_DATA`` at the root of the local drive, so it will get picked up later for importing via the Web UI.


Create a New Super User
~~~~~~~~~~~~~~~~~~~~~~~

In case you need to create another Super user, either to address additional need of managing facility, or if you lost the password for the old one, run the following command:

.. code-block:: bash

  kolibri manage createsuperuser

You will be prompted to input the **Username** and **Password** and the new **Super user** user account will be created.


Change Language
~~~~~~~~~~~~~~~

.. code-block:: bash

  kolibri language setdefault <langcode>

+-----------------------+-----------------+ 
| Available languages in Kolibri          | 
+=======================+=================+ 
| English               | ``en``          |
+-----------------------+-----------------+
| Spanish (Spain)       | ``es-es``       | 
+-----------------------+-----------------+ 
| French                | ``fr``          | 
+-----------------------+-----------------+
| Swahili (Tanzania)    | ``sw-tz``       | 
+-----------------------+-----------------+
| Arabic                | ``ar``          | 
+-----------------------+-----------------+
| Farsi                 | ``fa``          | 
+-----------------------+-----------------+
| Urdu (Pakistan)       | ``ur-pk``       | 
+-----------------------+-----------------+


Backup and Restore Kolibri Database
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Kolibri automatically creates a backup of the database with every version upgrade. If for some reason you need to make a manual backup, use the following command.

.. code-block:: bash

  kolibri manage dbbackup

This command will create a time-stamped ``.dump`` file in the ``./kolibri/backups`` folder that you can use to restore the database with the following command.

.. code-block:: bash

  kolibri manage dbrestore --latest

If you need to restore a backup version prior to the latest one, you must specify the full path to a specific ``*.dump`` file.

.. code-block:: bash

  kolibri manage dbrestore ~/.kolibri/backups/db-xxxx.dump

.. warning::
  This command is not intended for replication across different devices, but **only** for restoring on a single device from a local backup of the database.