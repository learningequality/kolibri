.. _manage_device_ref:

Manage Device
~~~~~~~~~~~~~

You can manage content and permissions, and view the detailed info of the device where Kolibri is running from the **Device** dashboard.

.. note::
  To manage device settings you must have the appropriate permissions.


.. _permissions:

Assign Permissions
------------------

You can assign additional permissions to Kolibri users which will provide them access to more features compared to their :ref:`user roles <user_roles>`. To manage permissions for Kolibri users, use the **Permission** tab in the  **Device** dashboard (|lock| icon).

	.. image:: img/manage-permissions.png
	  :alt: manage permissions  

Permission to Manage Content
****************************

To grant permission to manage content channels in Kolibri to another user, follow these steps.

#. Click **Edit permissions** for the chosen user.
#. Under **Device Permissions** activate the option *Can import and export content channels*.
#. Click **Save changes** to apply and finish.

	.. image:: img/manage-content-permissions.png
	  :alt: grant permissions to manage content

The users who have been granted the permissions to manage content channels will have a black key indicator in front of their name, and will be able to see the **Device** dashboard with the **Content** tab.


Super User Permissions
**********************

To grant **Super user** permissions to another user, follow these steps.

#. Click **Edit permissions** for the chosen user.
#. Activate the option *Make superuser*.
#. Click **Save changes** to apply and finish.

	.. image:: img/coach-superuser.png
	  :alt: grant superuser permissions

The users who have been granted the **Super user** permissions will have a yellow key indicator in front of their name, and will be able to see the **Device** dashboard with both the **Content** and **Permissions** tabs.

	.. image:: img/permissions-keys.png
	  :alt: permissions indicators


.. _device_info:


View Device Info
----------------

To view the detailed info of the device where Kolibri is running on, use the **Info** tab in the  **Device** dashboard (|info| icon). This information will be useful in case you need to report an issue with Kolibri to FLE support team. Make note or copy the following device details:

* Kolibri version
* Server IP/URL(s)
* Database path
* Device name
* Operating system 
* Free disk space
* Server time
* Server timezone


.. figure:: img/device-info.png
  :alt: Find out the detailed device info in the Device > Info tab.

  Find out the detailed device info in the Device > Info tab.