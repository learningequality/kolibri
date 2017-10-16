Initial Setup
=============


``TODO - Onboarding``

Create a “super-user” for your Kolibri installation, and a **Facility** is a group of users and their associated data.

In order to manage Kolibri content channels, data and users, you must first create a **Super user** account and the **Facility**. The **Device Owner** account registration page appears when you start the server for the first time  after the installation of Kolibri and open the browser at http://127.0.0.1:8080/ (the default URL).


#. Enter the required information (username, password, name of the facility). Fields marked with an asterisk (*) are required.
#. Select **Create and get started**.


Adding a New Super User
***********************

In case you need to create another super-user, either to address additional need of managing facility or if you lost the password for the old one, run the following command (open the ``cmd.exe`` command prompt in Windows or the **Terminal** in Linux):

.. code-block:: bash

  kolibri manage createsuperuser

You will be prompted to input the **Username** and **Password** and the new **Device Owner** user account will be created.