Device Owner
============

Create Device Owner Account
~~~~~~~~~~~~~~~~~~~~~~~~~~~

In order to manage Kolibri content channels, data and users, you must first create a **Device Owner** account and the **Facility**. The **Device Owner** account registration page appears when you start the server for the first time  after the installation of Kolibri and open the browser at http://127.0.0.1:8080/.

.. image:: img/wizard.png
  :alt: create device owner form


#. Enter the required information for the **Device Owner** account (username, password, name of the facility). Fields marked with an asterisk (*) are required.
#. Select **Create and get started**.


Add a New Device Owner
----------------------

**Device Owner** is a “super-user” for your Kolibri installation. In case you need to create another user with this kind of permissions, run the following command (open the ``cmd.exe`` command prompt in Windows):

.. code-block:: bash

  kolibri manage createsuperuser

You will be prompted to input the **Username** and **Password** and the new **Device Owner** user account will be created.


.. include:: manage_facility.rst


.. include:: manage_users.rst


.. include:: manage_classes.rst


.. include:: manage_data.rst


.. include:: manage_content.rst


.. include:: get_support.rst

