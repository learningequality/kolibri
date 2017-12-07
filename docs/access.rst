Access Kolibri
##############


Starting Kolibri on Windows
===========================

To start **Kolibri** on Windows, just double-click the desktop shortcut. You will see the notification message *Kolibri is starting, please wait...*.

When you see the notification *Kolibri is running...*, **Kolibri** will open in the browser with the URL http://127.0.0.1:8080.


Kolibri Taskbar Options
***********************

While it is running, **Kolibri** will display an icon in the Windows taskbar (usually at bottom right, near the clock), that allows you to stop it and configure other settings.  

    .. figure:: img/taskbar-options.png
     :alt: Kolibri taskbar options.

     Kolibri taskbar options.


* Use the **Load in browser** option to open Kolibri in the browser.
* By default **Kolibri** will start running every time you start the computer where it is installed. Uncheck the **Run Kolibri at system startup** option if you prefer to start it manually from the desktop shortcut.
* When installed, **Kolibri** will open in the browser everytime it is started. Uncheck the option **Open browser when Kolibri starts** if you prefer to have it running in the background, and to open it manually in the browser by typing the URL http://127.0.0.1:8080 in the address bar.
* Select **Exit** to stop **Kolibri**. You will be prompted to confirm the selection, after which **Kolibri** will stop. You will have to close the browser (or the tab) manually.

.. note::
  Remember to :ref:`configure other computers <access_LAN>` in the network to access **Kolibri** content.


Starting Kolibri on Linux
=========================

.. warning::
  Final **Kolibri** installer for Linux and OSX is not released yet, so these steps are *Work in Progress*!

1. Run this command in Terminal to start Kolibri:

  .. code-block:: bash

    kolibri start

2. Open the default browser at http://127.0.0.1:8080 displaying the **Kolibri** start page.

.. note::
  Remember to :ref:`configure other computers <access_LAN>` in the network to access **Kolibri** content.

3. Run this command in Terminal to stop Kolibri:

  .. code-block:: bash

    kolibri stop


Starting Kolibri on Android
===========================

.. warning::
  Final **Kolibri** installer for Android is not released yet, so these steps are *Work in Progress*!

Go to **Apps** on your device and tap the **Kolibri** icon.

    .. figure:: img/android-apps.png
      :alt: Tap the Kolibri icon among your device apps to start.

      Tap the Kolibri icon among your device apps to start.


.. _access_LAN:

Accessing Kolibri from Other Devices in the Network
===================================================

While **Kolibri** is up and running on the device where you installed it, other computers, tablets, even mobile phones in the same **Local Area Network (LAN)** can access its learning contents.

* To access the content on the same device/computer where **Kolibri** is running, open the browser at the address http://127.0.0.1:8080/.

* To access the content from other devices in the same network, you need to know the IP address of one where where **Kolibri** is running. For example, if **Kolibri** is on a device/computer with IP address **192.168.0.104**, you can access it from others in the same network by opening the browser and typing the address http://192.168.0.104:8080.

* You can check the IP (**Server URL**) of the device where Kolibri is running by going to **Info** tab in the **Device** dashboard, .

    .. figure:: img/device-info.png
      :alt: Find out the IP/Server URL in the Device > Info tab.

      Find out the IP/Server URL in the Device > Info tab.

.. note::
  You can also use the ``ipconfig`` command on Windows or ``ifconfig`` command on Linux/OSX to find out the IP address of the device running the **Kolibri**.


.. _change_language:

Change Language
===============

To change language in which **Kolibri** user interface is displayed, follow these steps.

#. Open your user menu in the upper right corner.
#. Select the **Change language** option.
#. Choose the desired language.
#. Click **Select** to confirm.