.. _command_line:


Working with Kolibri from the Command Line
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. warning::
  In Windows you need to open ``cmd.exe`` Command prompt in the folder where Kolibri executable is located: ``c:/Python27/Scripts``.

  *Make sure not to include the angle brackets “< >” in the commands below.*


If you see errors in the prompt/terminal output while running the commands below, ask for help at our `Community Forums <https://community.learningequality.org/>`_, or `file an issue on GitHub <https://github.com/learningequality/kolibri/issues/new>`_.


Start/Stop Kolibri
------------------

In case you need to troubleshoot potential problems while running Kolibri, you may try to start it manually from the command line.

.. code-block:: bash

  kolibri start --debug --foreground


.. code-block:: bash

  kolibri stop


Run Kolibri from a Different Port
*********************************

If you need to change the default port ``8080`` from which Kolibri is serving content, add the following flag to the previous command.

.. code-block:: bash

  kolibri start --port <new-port-number>


Import Content Channels from Internet
-------------------------------------

To import content channels from Internet, run these two commands in sequence. The first downloads the channel database, and the second downloads the resources (videos, documents, etc.). 

.. code-block:: bash

  kolibri manage importchannel -- network <Channel ID>
  kolibri manage importcontent -- network <Channel ID>

..
  Commented out because the API is weird and should be fixed
  
  Import Content Channels from a Local Drive
  ------------------------------------------
  
  To import content channels from the local drive, run these two commands in sequence. Local drive should have a folder ``KOLIBRI_DATA`` at the root, with Kolibri ``content`` inside.
  
  .. code-block:: bash
  
    kolibri manage importchannel -- local <Channel ID> /path/to/local/drive
    kolibri manage importcontent -- local <Channel ID> /path/to/local/drive


Export Content Channels
-----------------------

To export Kolibri content channels on a local drive in order to share it with another device, run these two commands in sequence. The first exports the channel database, and the second exports the resources (videos, documents, etc.). 

.. code-block:: bash

  kolibri manage exportchannel -- <Channel ID> /path/to/local/drive/KOLIBRI_DATA 
  kolibri manage exportcontent -- <Channel ID> /mount/mydrive/KOLIBRI_DATA 

The path should be to a folder named ``KOLIBRI_DATA`` at the root of the local drive, so it will get picked up later for importing via the Web UI.


Create a New Super User
-----------------------

In case you need to create another Super user, either to address additional need of managing facility, or if you lost the password for the old one, run the following command:

.. code-block:: bash

  kolibri manage createsuperuser

You will be prompted to input the **Username** and **Password** and the new **Super user** user account will be created.


Change Language
---------------

.. code-block:: bash

  kolibri language setdefault <langcode>

+-----------------------+-----------------+ 
| Language              | <langcode>      |
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
-----------------------------------

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


Change the Location of ALL Kolibri Files
----------------------------------------

If you want to change the directory where all of Kolibri’s runtime files go, the imported content channels, you need to change the environment variable called ``KOLIBRI_HOME`` to the path of your choice.

If the variable is left unset, by default, Kolibri’s runtime files and content will be placed in your user’s :ref:`Home <home>` folder, under the ``.kolibri`` subfolder. 

There are many ways to set an environment variable either temporarily or permanently. To start Kolibri on **OSX or Linux** with a different home, follow these steps.

#. Stop the server.
#. Move the ``.kolibri`` folder to the new location.
#. Run the following in Terminal:

.. code-block:: bash

  KOLIBRI_HOME=/path/to/new/home kolibri start

When you start the server again, all your files should be seamlessly detected at that location.

To change the environment variable ``KOLIBRI_HOME`` on **Windows**, follow these steps.

#. Stop the server.
#. Move the ``.kolibri`` folder to the new location.
#. Run the following in Command Prompt:

  .. code-block:: bash

    setx KOLIBRI_HOME "/path/to/new/home"

Restart the server, and your files should be seamlessly detected at the new location.


Alternatively, you can follow these steps in the GUI.

#. Go to **Computer > Advanced System Settings** and press the **Environment Variables** button.
#. Under **User Variables for...** press the **New...** button.
#. Input the new path and press **OK** on both open windows.

    .. image:: img/env-vars.png
      :alt: Set the new path for Kolibri home.

#. Restart Kolibri.
