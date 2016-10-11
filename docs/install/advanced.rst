.. _advanced-installation:

Advanced installation options
=============================

.. warning::
  Advanced installation options are not yet available!

.. _pip-installation:

Generic installation (pip install)
__________________________________


Installing through pip
~~~~~~~~~~~~~~~~~~~~~~

Once Kolibri is released, you may install it as a standard package from PyPi using this command::

    $ pip install kolibri --pre


.. _ppa-installation:

Debian/Ubuntu: Subscribe to updates through a PPA
_________________________________________________

``TODO - REVIEW this whole section once PPA is ready``


We maintain a `PPA on Launchpad <https://launchpad.net/~learningequality/+archive/ubuntu/kolibri>`_ and if you are connected to the internet, this will also give you automatic updates.

On Ubuntu, do this::

    sudo apt-get install software-properties-common python-software-properties
    sudo su -c 'echo "deb http://ppa.launchpad.net/learningequality/kolibri" > 
    ...
    sudo apt-get update
    sudo apt-get install kolibri


.. _development-installation:

Development
___________
A guide recommending how to install Kolibri for development is available in
:ref:`development-environment`.



Specific system setups
______________________

``TODO - REVIEW this whole section once RPi installer is ready``

.. _raspberry-pi-wifi:

Raspberry Pi Wi-Fi
~~~~~~~~~~~~~~~~~~


#. Install the .deb package, see :ref:`raspberry-pi-install`.
#. Get the network configuration scripts.
    * ``cd /opt``
    * ``sudo git clone https://github.com/learningequality/ka-lite-pi-scripts.git``
#. Install and configure the access point::
  
    cd /opt/ka-lite-pi-scripts
    sudo ./configure.sh

   .. note::
         If using the Edimax EW-7811UN, ignore the "hostapdSegmentation fault" error.

#. Install the USB adaptor software.
    * If using the WiPi, run this command::
            cd /opt/ka-lite-pi-scripts
            sudo ./use_wipi.sh

    * If using the Edimax EW-7811Un, run this command:
        * ``cd /opt/ka-lite-pi-scripts``
        * ``sudo ./use_edimax.sh``
#. Complete the access point configuration
    * ``sudo python ./configure_network_interfaces.py``
    * ``sudo insserv hostapd``
#. Finally
    * ``sudo reboot``
    * A wireless network named "kalite" should be available.
    * Connect to this network
    * If the KA Lite server is started, browse to 1.1.1.1