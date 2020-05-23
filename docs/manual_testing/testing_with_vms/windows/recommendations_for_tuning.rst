Recommendations for VM tuning prior to Kolibri installation
-----------------------------------------------------------

Manual testing is not a complex process, it usually involves a repetition of predetermined steps in a given testing scenario and recording the results, but it can be time consuming. Unless you are working with VirtualBox on a powerful host computer, VM will run more slowly. The following list of actions to take will help you tune the VM and make it as fast as possible. Apart from allocating as much RAM and processor power as your host OS can spare, you should also perform the following steps:


Disable Windows Update and Modules installer
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Modern.ie VMs will come with Windows Update enabled and active by default just as any regular OS. Downloading and installing the updates will require time and occupy VM resources, which will slow down your testing process. Since it is unlikely that Kolibri installation will be somehow affected by VM without the latest Microsoft patches, you should disable Windows Update altogether.

1. Go to **Control Panel > Windows Update > Change settings** and select *Never check for updates* from the drop down menu. Press the **OK** button to save the selection.

   .. image:: ./recommendations_for_tuning_01.png

2. Unfortunately, previous step does not seem to be quite enough, so the fastest solution is to stop the two culprit services altogether. Go to **Control Panel > Administrative Tools > Services**, locate the **Windows Update** and **Windows Modules Installer** services on the list and right-click on each to open their *Properties* window:

   .. image:: ./recommendations_for_tuning_02.png

   a) Press the **Stop** button in the Properties window to stop the service.

   b) Select **Manual** from the Startup type drop down menu.

      Beware not to select **Disabled** as it may hinder the installation of Python.

   c) Press buttons **Apply** and **OK**.

   .. image:: ./recommendations_for_tuning_03.png

3. Restart the VM. This way both **Windows Update** and **Windows Modules Installer** services will not hog the resources on your VM anymore and testing will be much faster!
