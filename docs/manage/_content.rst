.. _manage_content_ref:

Manage Content
~~~~~~~~~~~~~~

.. note::
  To manage Kolibri content channels you must have the appropriate permissions.

Kolibri **Content Channel** is a collection of educational resources (video, audio or document files) prepared and organized by the content curator for their use in Kolibri. You can import and export content channels in Kolibri from the **Content** tab of the **Device** dashboard (|content| icon).

.. image:: img/manage-content.png
  :alt: manage content page with list of available channels


Each Kolibri content channel has its own **token/ID** in `Kolibri Studio <https://studio.learningequality.org/accounts/login/>`_. You can freely view and browse content to import from the **public** channels in Kolibri, but in order to import content from **private or unlisted** channels, you will need the **channel token or ID from the content curator who assembled it**.

.. warning:: The term **Channel ID** was valid for Kolibri versions up to 0.6, while from the Kolibri version 0.7 onward, we will start using exclusively the term **token** to uniquely designate each channel.

Import Content into Kolibri
---------------------------

.. warning:: **Important**: You **cannot** import your own files (videos, documents, etc.) as learning resources directly into Kolibri from your computer. Kolibri can **only** import content from:

  * already curated **content channels** on `Kolibri Studio <https://studio.learningequality.org/accounts/login/>`_, if the computer running Kolibri is connected to internet

  OR 

  * an external storage drive (USB or hard drive) where content channels have been previously exported to from another Kolibri installation, if the computer running Kolibri is not connected to internet

  **To import your own files for use in Kolibri**, you need to register at `Kolibri Studio <https://studio.learningequality.org/accounts/login/>`_ site (it's free), and build your own content channel that you can subsequently import into Kolibri. Read more about how to do this in our `Kolibri Studio user guide <http://kolibri-studio.readthedocs.io/en/latest/index.html>`_. 


.. tip::
  As a precaution, we recommend you avoid other interactions with Kolibri (navigate away or manage users, for example) while content import is in progress.


To import content into Kolibri, follow these steps.

#. Click **Import** button in the **Content** page.
#. Choose the source option: **Kolibri Studio** or **Attached drive or memory card**.

.. image:: img/import-choose-source.png
  :alt: choose source for importing content



Import Content from Kolibri Studio
**********************************

If the computer where Kolibri is running has an Internet connection with the sufficient bandwidth, follow these steps to import content channels.

.. _central_server:

#. Choose option *Kolibri Central Server*, and you will be able to see all the available **public** content channels. 
  
  	.. image:: img/kolibri-central-server.png
	  :alt: Select from which public channel you want to import content from.

#. Click **Select** button for the desired channel, and wait for Kolibri to display the channel information and the topic tree.
#. In the **Select content** page you will see all the details of the selected channel: description, version, total size and number of learning resources, with the information weather you have some of the resources from that channel already imported on the local device.

  	.. image:: img/select-content.png
	  :alt: Select topics and resources to import from channel.

#. Under **Choose content to import** you can browse the channel topics and individual resources. Use the *Select all* checkbox to import the content channel in full, or select only certain topics or resources. As you keep selecting, you will see the total number and size on disk under *Resources selected:*, and the remaining space on your device.
#. Click **Import** button once you finish selecting all the desired content.
#. Wait for the content to be downloaded and click **Close** for the new channel to appear under the **Content** heading.

	.. image:: img/import-CC.png
	  :alt: wait for import channel to finish

#. If you need to import content from a **private/unlisted** channel, scroll to the bottom of the *Kolibri Central Server* page.
#. Click on **Try adding the token** link, and enter the **channel token/ID** received from the channel curator on Kolibri Studio.

	.. image:: img/enter-token.png
	  :alt: enter content token to import from unlisted channel

#. Click **Confirm** to unlock channel, or **Cancel** to exit.
#. Proceed to select and import channel topics and resources as for the public channels.


Import Content from a Local Drive
*********************************

If the computer where Kolibri server is running does not have access to Internet or has insufficient bandwidth, you have the option to receive content channels stored on an external drive (USB stick or hard disk). Follow these steps to import content channels.

#. Connect the external USB drive to your computer.
#. Choose option for *Attached drive or memory card*, and click **Continue**.
#. Kolibri will automatically detect and display the drive(s) with available Kolibri content files.
#. Select the drive where the desired channel is stored, and click **Continue**.
#. Click **Select** button for the desired channel, and follow the same steps for selecting topics and resources as for the :ref:`import from Kolibri Central Server <central_server>`. 

  .. image:: img/import-local-drive2.png
    :alt: import channel from detected local drive


.. tip:: **Workaround for import from external drive on older devices.**

	If Kolibri is installed on an older or a low-resource device, you can try the following procedure for importing content channels for faster results.

	#. Stop Kolibri.
	#. Browse the local drive with the file explorer of your operating system.
	#. Copy the ``content`` folder located inside the ``KOLIBRI_DATA`` folder on the local drive.
	#. Paste the copied ``content`` folder inside the ``.kolibri`` folder on your hard disk. The location of the ``.kolibri`` folder will depend on your operating system (see the table below).
	#. Confirm the merge of the two folders.
	#. Restart Kolibri, and the new channels should now be available.


.. _home:

     +---------------------------+-----------------------------------------+
     | **Operating system**      | **Location**                            |
     +===========================+=========================================+
     | Windows                   | ``C:/Users/<your_username>/.kolibri/``  |
     +---------------------------+-----------------------------------------+
     | OSX                       | ``HD/Users/<your_username>/.kolibri/``  |
     +---------------------------+-----------------------------------------+
     | Linux                     | ``/home/<your_username>/.kolibri/``     |
     +---------------------------+-----------------------------------------+

     On Linux and OSX you will need to enable the **Show hidden folders** option in order to view the ``.kolibri`` folder.


Export from Kolibri to Local Drive
----------------------------------

If you want to make available the content you have imported on your Kolibri device, to another computer where Kolibri is installed, follow these steps to export your content channels.

.. note::
  You must have an external drive (USB stick or hard disk) attached to your device.

#. Click **Export** button in **Content** page.
#. Select the local drive (export destination) where you wish to export **Kolibri** content, and click **Continue**.
#. In the *Export to <name-of-your-drive>* page you will be able to see all the available content channels on your device.

  	.. image:: img/export-to.png
	  :alt: Select from which channel you want to export to local drive.

#. Click **Select** button for the desired channel, and wait for Kolibri to display the channel information and the topic tree.
#. In the **Select content** page you will see all the details of the selected channel: description, version, total size and number of learning resources.
#. Under **Choose content to export** you can browse the channel topics and individual resources. Use the *Select all* checkbox to import the content channel in full, or select only certain topics or resources. As you keep selecting, you will see the total number and size on disk under *Resources selected:*, and the remaining space on the destination drive.
#. Click **Export** button once you finish selecting all the desired content.
#. Wait for Kolibri to export the selected content and click **Close**.
#. Once the export is finished, safely disconnect the drive according to the recommended procedure for your operating system, and proceed to import channels on other devices.

.. note:: This procedure makes a copy of the ``content`` folder located inside the ``.kolibri`` folder on your hard disk, and places it the ``KOLIBRI_DATA`` folder on the selected local drive. This structure is recognized by the **Import from local drive** command.

	.. image:: img/kolibri-data-osx.png
	  :alt: structure of the local drive folders with exported content channels


Peer-to-Peer Content Synchronization
------------------------------------

``Stay tuned!``


.. Not yet. Peer to peer sync is a priority for Kolibri in the near future, but is not available yet.
