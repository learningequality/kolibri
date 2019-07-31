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
  deployments at different sites, you should consider a strategy for keeping
  software and contents updated.

As well as database migrations, there are also sometimes additional fixes that
are put into Kolibri in order to facilitate moving between versions. This may be
for bug fixing or efficiency purposes. These are sometimes carried out outside of
migrations in order to leverage the full Kolibri code base, which can be restricted
inside the contexts of Django data migrations.

In order to implement these upgrades, a decorator is available in ``kolibri.core.upgrade``,
``version_upgrade``. An toy example is shown below.

.. code-block:: python

  import logging
  from kolibri.core.upgrade import version_upgrade

  logger = logging.getLogger(__name__)

  @version_upgrade(old_version="<0.6.4", new_version=">=1.0.0")
  def big_leap_upgrade():
      logger.warn("You've just upgraded from a very old version to a very new version!")

If placed into a file named ``upgrade.py`` either in a core app that is part of the ``INSTALLED_APPS``
Django setting, or is in an activated Kolibri plugin, this upgrade will be picked up and run any time
an upgrade happens from a version older than ``0.6.4`` to a version equal to or newer than ``1.0.0``.

.. _downgrading:

Downgrading
-----------

To downgrade you need to do two steps:

#. If you have been using the latest version and want to store data, make sure
   to create a backup before continuing: ``kalite manage dbbackup``
#. Install the older version on top of the new version using the same
   installation type.
#. Restore the latest :ref:`backup`.

When you upgrade Kolibri, the database is changed to match the latest version
of Kolibri, however these changes cannot be unmade. That's why you need to
restore the database from a backup.


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

.. warning:: Restoring from backup will overwrite the current database, so
    store a backup in case you have data you want to preserve!

To restore from the latest available backup, run the following from command
line::

    $ kolibri manage dbrestore --latest

To restore from a specific backup file::

    $ kolibri manage dbrestore /path/to/db-backup.dump
