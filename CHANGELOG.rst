.. :changelog:

=============
Release notes
=============

*Don’t let your friends dump git logs into CHANGELOGs™*

http://keepachangelog.com/

Kolibri 0.0.1
+++++++++++++

* Begin development of core auth app.
  * Add core user types (BaseUser, FacilityUser, DeviceOwner)
  * Add Collections and Roles, implemented using a special tree structure for efficient querying
  * Add authentication & authorization backends
  * Implement permissions for FacilityUsers by checking hierarchy relationships
  * Adds pipelining and integration for building frontend assets with webpack and dynamically serving them in Django.
  * Updates to *Users, Collections, and Roles, mostly to account for multiple facilities in one database

