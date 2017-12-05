.. _manage_content:

Manage Content
~~~~~~~~~~~~~~

.. note::
  To manage Kolibri content channels you must have the appropriate permissions. 

Kolibri **Content Channel** is a collection of educational resources (video, audio or document files) prepared and organized by the content curator for their use in Kolibri. Each Kolibri **Content Channel** has its own *Content Channel ID* in `Kolibri Studio <https://studio.learningequality.org/accounts/login/>`_. In order to import channels in Kolibri, you **need the channel ID from the content curator who assembled it**.

You can import and export **Content Channels** for Kolibri in the **Content** tab of the **Device** dashboard.

	.. image:: img/manage-content.png
	  :alt: manage content page with list of available channels


Import Content Channel to Kolibri
---------------------------------

To import **Content Channel** to Kolibri, follow these steps.

#. Click **Import** button in **My Channels** pane.
#. Choose the source option (*Internet* or *Local Drives*).

	.. image:: img/import-choose-source.png
	  :alt: choose source for importing content


Import Content Channel from the Internet
****************************************

If the computer where Kolibri is running has an Internet connection with the sufficient bandwidth, follow these steps to import content channels.  

#. Choose option for *Internet*.
#. Enter *Content ID* for the desired channel from Kolibri Studio. 
#. Click **Import** button, and confirm the import. 
#. Wait for the content to be downloaded and click **Close** for the new channel to appear under the **My Channels** heading.

	.. image:: img/import-internet.png
	  :alt: enter content id to import channel from Internet

----------------------------------------

	.. image:: img/import-CC.png
	  :alt: wait for import channel to finish


Import Content Channel from a Local Drive
*****************************************

If the computer where Kolibri server is running does not have access to Internet or has insufficient bandwidth, you have the option to receive content channels stored on an external drive (USB stick or hard disk). Follow these steps to import content channels. 

#. Insert the USB drive in your computer.
#. Choose option for *Local Drives*.
#. Kolibri will automatically detect the drive(s) with available content files.
#. Select the drive where the channel content is stored.
#. Click **Import** button.
#. Wait for the content to be imported and click **Close** for the new channel to appear under the **My Channels** heading.

	.. image:: img/import-local-drive.png
	  :alt: import channel from detected local drive

.. note::
  If the local drive is not detected, try re-inserting the storage device (USB stick or external hard disk) and pressing the button **Refresh**.


.. tip:: **Workaround for import from local drive on older devices.**

	If Kolibri is installed on an older or a low-resource device, you can try the following procedure for importing content channels for faster results.

	#. Stop Kolibri.
	#. Browse the local drive with the file explorer of your operating system. 
	#. Copy the ``content`` folder located inside the ``KOLIBRI_DATA`` folder on the local drive.
	#. Paste the copied ``content`` folder inside the ``.kolibri`` folder on your hard disk. The location of the ``.kolibri`` folder will depend on your operating system (see the table below).
	#. Confirm the merge of the two folders.
	#. Restart Kolibri, and the new channels should now be available.


     +---------------------------+-----------------------------------------+
     | **Operating system**      | **Location**                            |
     +===========================+=========================================+
     | Windows                   | ``C:/Users/<your_username>/.kolibri/``  |
     +---------------------------+-----------------------------------------+
     | OSX                       | ``HD/Users/<your_username>/.kolibri/``  |
     +---------------------------+-----------------------------------------+
     | Linux                     | ``/home/<your_username>/.kolibri/``     |
     +---------------------------+-----------------------------------------+


Export from Kolibri to Local Drive
----------------------------------

If you want to make available the content you have imported on your Kolibri server, to another computer where Kolibri is installed, follow these steps to export your content channels. 

.. note::
  You must have an external drive (USB stick or hard disk) attached to your device.

#. Click **Export** button in **My Channels** pane.
#. Select the local drive where you wish to export **Kolibri** content.
#. Click **Export** button.
#. Once the export is finished, safely disconnect the drive according to the recommended procedure for your operating system, and proceed to import channels on other devices. 

	.. image:: img/export-local-drive.png
	  :alt: export channel to detected local drive

This procedure makes a copy of the ``content`` folder located inside the ``.kolibri`` folder on your hard disk, and places it the ``KOLIBRI_DATA`` folder on the selected local drive. This structure is recognized by the **Import from local drive** command.

	.. image:: img/kolibri-data-osx.png
	  :alt: structure of the local drive folders with exported content channels