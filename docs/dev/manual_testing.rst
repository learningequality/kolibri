
Manual Testing & QA
===================


Cross-browser and OS Testing
----------------------------

It's vital to ensure that our app works across a wide range of browsers and operating systems, particularly older versions of Windows and Android that are common on older and cheaper devices.

In particular, we want to ensure that Kolibri runs on major browsers that match any of `the following criteria <http://browserl.ist/?q=%3E+1%25%2C+last+2+versions%2C+ie+%3E%3D+9%2C+Firefox+ESR>`_:

 * within the last two versions
 * IE 9+ on Windows XP and up
 * has at least 1% of global usage stats

Here are some useful options, in order of simplicity:

**BrowserStack**

`BrowserStack <https://www.browserstack.com/>`_ is an incredibly useful tool for cross-browser and OS testing. In particular, it's easy to install plugin which forwards ``localhost`` to a VM running on their servers, which in turn is displayed in your browser.

**Amazon Workspaces**

In some situations, simply having a browser is not enough. For example, a developer may need to test Windows-specific backend or installer code from another OS. In many situations, a virtual machine is appropriate - however these can be slow to download and run.

Amazon's `AWS Workspaces <https://aws.amazon.com/workspaces/>`_ provides a faster alternative. They run Windows VMs in their cloud, and developers can RDP in.

**Local Virtual Machines**

Workspaces is very useful, but it has limitations: only a small range of OSes are available, and connectivity and provisioning are required.

An alternative is to run the guest operating system inside a virtual machine using e.g. `VirtualBox <https://www.virtualbox.org/wiki/Downloads>`_. This also gives more developer flexibility, including e.g. shared directories between the guest and host systems. `This tutorial <https://docs.google.com/document/d/10LgeCJmqsweui0yTTCDf4DjY5aoNNpXG8hF_DGKUHAI/edit>`_ was written for KA Lite, but much of it still applies to Kolibri.

**Hardware**

There are some situations where actual hardware is necessary to test the application. This is particularly true when virtualization might prohibit or impede testing features, such as lower-level driver interactions.


Responsiveness to Varying Screen Sizes
--------------------------------------

We want to ensure that the app looks and behaves reasonably across a wide range of typical screen sizes, from small tablets to large, HD monitors. It is highly recommended to constantly be testing functionality at a range of sizes.

Chrome and Firefox's Developer Tools both have some excellent functionality to simulate arbitrary screen resolutions.


Slow Network Connection Speeds
------------------------------

It's important to simulate end-users network conditions. This will help identify real-world performance issues that may not be apparent on local development machines.

Chrome's Developer Tools have functionality to simulate a variety of network connections, including Edge, 3G, and even offline. An app can be loaded into multiple tabs, each with its own custom network connectivity profile. This will not affect traffic to other tabs.

Within the Chrome Dev Tools, navigate to the Network panel. Select a connection from the drop-down to apply network throttling and latency manipulation. When a Throttle is enabled the panel indicator will show a warning icon. This is to remind you that throttling is enabled when you are in other panels.

For Kolibri, our target audience's network condition can be mimicked by setting connectivity to Regular 3G (100ms, 750kb/s, 250 kb/s).

