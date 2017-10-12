Upgrading
=========

.. warning:: These instructions are under development

Upgrade paths
-------------

Kolibri can be automatically upgraded forwards. For instance, you can upgrade
from ``0.1->0.2`` and ``0.1->0.7``. We test all upgrade paths, but we also
caution that the more versions that you skip, the higher the risks will be
that something isn't working as expected.

That's why we also support :ref:`downgrading`.

Every time Kolibri is upgraded, it will automatically migrate your database
and create a backup before doing so.

.. note:: Always upgrade **as often as possible**. If you are responsible for
  many installations, you should 

.. _downgrading:

Downgrading
-----------

To downgrade you need to do two steps:

#. Install the older version on top of the new version using the same
   installation type.
#. Restore the latest :ref:`backup`.

When you upgrade Kolibri, the database is changed to match the latest version
of Kolibri, however these changes cannot be unmade. That's why you need to
restore the database from a backup.

After downgrading, you can restore from the latest backup matching your version
by running::

    $ kolibri manage restore --latest


.. _backup:

Database backup
---------------

While upgrading, Kolibri will **automatically** generate a backup of the
database before making any changes. This guarantees that in case the upgrade
causes problems, you can downgrade and restore the backup.

Backups
~~~~~~~

Kolibri stores database backups in ``~/.kolibri/backups``. The dump files
created contain SQL statements to be run by SQLite3. You can re-instate a
dump by using the special ``dbrestore`` command.

Restoring from backup
~~~~~~~~~~~~~~~~~~~~~

To restore from the latest available backup, run the following from command
line::

    $ kolibri manage dbrestore --latest

To restore from a specific backup file::

    $ kolibri manage dbrestore /path/to/db-backup.dump

