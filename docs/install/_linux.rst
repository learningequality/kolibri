.. _lin:

Debian/Ubuntu Linux
===================

.. warning::
  Beware that the final Linux ``deb`` installer is still Work-in-Progress, and that you may run into issues with the steps indicated below Please report any problems with this installer on our `GitHub repository <https://github.com/learningequality/kolibri-installer-debian/issues/new>`_.

  However, you can run Kolibri in Terminal using the package called ``PEX``. Follow the same procedure as indicated for :ref:`macOS <osx>`.


Install from PPA repository
---------------------------

#. Use the following commands in Terminal to add the PPA and install Kolibri.

  .. code-block:: bash

    sudo add-apt-repository ppa:learningequality/kolibri
    sudo apt-get update
    sudo apt-get install kolibri

**OR**

#. Go to `Kolibri project page on Launchpad <https://launchpad.net/~learningequality/+archive/ubuntu/kolibri/+packages>`_.
#. Click and select the latest source package. It doesn't matter which series, all binaries are the same, regardless of your architecture or Ubuntu/Debian version.
#. Scroll down to **Package files**.
#. Download the Kolibri installer  (``DEB`` file).
#. Run the command:

  .. code-block:: bash

    sudo dpkg -i kolibri-installer-filename.deb

5. Wait for the installation to finish and run this command to start Kolibri:

  .. code-block:: bash

    kolibri start
	
6. When command finishes, open the default browser at http://127.0.0.1:8080 and proceed with the :ref:`setup_initial` of your facility. 


Uninstall
---------

* Open up **Software** on Ubuntu and locate the Kolibri. Press **Remove**.

OR

* Use ``sudo apt-get remove <name of package>``. You need to know the exact name of the package you installed, most probably ``kolibri``.

Upgrade
-------

``TODO - Review``

To upgrade Kolibri, follow these steps.

#. Download the new version of Kolibri.
#. Start the installer.
#. Once the installation of the upgrade is finished, Kolibri will auto-start and open in the default browser on your computer.
#. Go explore the new and improved Kolibri features!