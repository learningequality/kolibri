Manual Testing / QA
==============================

Mimic End-User Network Connectivity
------------------------------------

It's importmant to emulate end-users network condition. This will provide a way to fix any load time issues.


Tools: Chrome DevTool
~~~~~~~~~~~~~~~~~~~~~~~~

Chrome's DevTool may test the site on a variety of network connections, including Edge, 3G, and even offline. Each tab can have it's own custom network connectivity profile that are specific to the audiences network conditions. This will not affect traffic to other tabs.

Within the Chrome DevTool, navigate to the Network panel. Select a connection from the dropdown to apply network throttling and latency manipulation. When a Throttle is enabled the panel indicator will show a warning icon. This is to remind you that throttling is enabled when you are in other panels.


Network Setting: Regular 3G (100ms, 750kb/s, 250 kb/s)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

For Kolibri, our target audience's network condition can be mimicked by setting connectivity to Regular 3G (100ms, 750kb/s, 250 kb/s).


Custom Throttles:
~~~~~~~~~~~~~~~~~~~

If the default connectivities doesn't match end-user's network condition, Chrome allows customize conditions.

Find more information on how to create custom throttles `here. <https://developers.google.com/web/tools/chrome-devtools/profile/network-performance/network-conditions?hl=en>`_







