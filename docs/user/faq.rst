Frequently Asked Questions
==========================

Network Terminology
-------------------

About IP addresses
~~~~~~~~~~~~~~~~~~

* 0.0.0.0 = A special IP address on the server (your device serving Kolibri), which actually means "all available IP addresses". It's a kind of alias. But accessing "0.0.0.0" from another computer doesn't make sense and doesn't work. By default, Kolibri will serve on "0.0.0.0", which essentially means all IP addresses that are available on the device will render Kolibri accessible.
* 127.0.0.1 = A device's local IP address, meaning "myself". Some people joke and say "There's no place like 127.0.0.1", meaning "there's no place like home" :) This can be used on the serving device itself to test that Kolibri is running, in case you need a failsafe way of checking that Kolibri is in fact running and responsive.
* 192.x.y.z = Addresses starting with 192 are local network IP addresses. The same thing can be said about 10.x.y.z. The address that you wanna use to enter on the clients/tablets in order to contact the laptop will in most cases start with 192 or 10.
* Port number: Kolibri runs on port 8080. When you access something on an IP address, you need a port. Ports can be open or closed on the laptop, but they can also be regulated by firewall rules on the way. http:// <- this is the protocol that the browser reads out from the "URL", which is just some text that describes Kolibri.
* http://192.168.1.1:8080 means: "Connect to IP address 192.168.1.1 on port 8080 with the HTTP protocol". The browser will the continue to try to reach this address, but may fail for instance if Kolibri isn't running, or if a step along the way blocks access.


Troubleshoot Network Problems
-----------------------------

#. Can you access Kolibri via http://127.0.0.1:8080?
#. Can you access anything from the laptops external IP **FROM** the laptop itself?
#. (something about being able to ping another device on the network)

