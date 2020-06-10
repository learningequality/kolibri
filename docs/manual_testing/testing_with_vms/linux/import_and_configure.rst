Import and configure Ubuntu VM image into VirtualBox
----------------------------------------------------

1. Extract the contents of downloaded **.7z** file to obtain the corresponding VM image file with **.vdi** extension.
2. Open VirtualBox click on **New** button.
3. Type OS Name, select OS Type and click **Next**.

   .. image:: ./vbox-1.jpg

4. Set available RAM.

   .. image:: ./vbox-2.jpg

5. Select **Use an existing virtual hard drive file**, browse to where VDI image is located.

   .. image:: ./vbox-3.jpg

6. Click on **Settings** and amplify video memory for VM, and **Enable 3D Acceleration**.

   .. image:: ./vbox-4.jpg

7. In the **Shared Folders** pane add the folder you created previously where you keep Kolibri and other installers on your host machine that you want to make available for virtual machines.

   .. image:: ./vbox-5.png

8. Start the newly imported VM.
9. Open **Devices** menu and select **Insert Guest Additions CD image…** option.

   .. image:: ./vbox-6.jpg

   .. image:: ./vbox-7.jpg

10. Add your Ubuntu user in `vboxsf` group to access VirtualBox shared folder in Ubuntu guest. Open Terminal and run:

    .. code-block:: bash

      sudo adduser <username> vboxsf

11. Reboot and you’ll be able to find and open the folder shared in VirtualBox **Settings**, under the **Network** in Ubuntu guest.
12. Happy testing!
