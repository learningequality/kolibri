Access Kolibri 
==============


Starting Kolibri on Windows
---------------------------

Kolibri has two parts: **Kolibri launcher** and **Kolibri server**.

**Kolibri launcher** is located in the Windows taskbar (usually at bottom right, near the clock), and allows you to start and stop the **Kolibri server**, and configure other settings.

**Kolibri server** runs as a background process and displays (*serves*) learning content in the browser.

* Double-click Kolibri desktop shortcut to start **Kolibri launcher**.
* Right click the taskbar icon to open the **Kolibri launcher** menu.

.. image:: img/task_tray_options.png
  :alt: kolibri taskbar menu options

.. warning::
  Starting **Kolibri launcher** will not start **Kolibri server** by default, but you can configure that setting in the launcher options if it suits your needs better.


Kolibri Launcher Menu Options
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

* Select **Start Server** to start the **Kolibri server**. 

  #. You will see the notification message *Kolibri server is starting, please wait...*. While server is starting, the options **Start/Stop/Load in browser** will be disabled.
  #. Once **Kolibri server** has started you will see the notification message *Kolibri server is running...*. The options **Stop Server** and **Load in browser** will now be available.
* Select **Load in browser** to open the default browser at http://127.0.0.1:8080 displaying the Kolibri start page.
* Select **Stop Server** when you want to stop the **Kolibri server**.
* Select **Options** submenu for further configuration.

  #. Activate **Run Kolibri when user logs in** option if you want **Kolibri launcher** to start automatically when you log into the system.
  #. Activate **Auto-start server when Kolibri is run** option if you want the **Kolibri server** to start at the same time as the **Kolibri launcher**.
  
  .. note::
    If you want **Kolibri server** to auto-start as soon as you log into the system, activate both of the above options. 


Starting Kolibri on Linux
-------------------------

.. warning::
  Final Kolibri installer for Linux is not released yet, so these steps are *Work in Progress*!

Open the default browser at http://127.0.0.1:8080 displaying the Kolibri start page.

 
Accessing Kolibri from Other Devices in the Network
---------------------------------------------------

While **Kolibri server** is up and running, other devices (computers, tablets, even mobile phones) in the same **Local Area Network (LAN)** can access its learning contents.

* To access the content on the same device/computer where **Kolibri server** is running, open the browser at the address http://127.0.0.1:8080/. 

* To access the content from other devices in the same network, you need to know the IP address of one where where **Kolibri server** is running. For example, if **Kolibri server** is on a device/computer with IP address **192.168.0.104**, you can access it from others in the same network at the address http://192.168.0.104:8080. 
.. note::
  Use the ``ipconfig`` command on Windows or ``ipconfig`` command on Linux to find out the IP address of the device running the **Kolibri server**.
