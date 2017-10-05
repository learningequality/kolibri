.. _release_process:
Release Process
===============

Update the Change log (release notes)
-------------------------------------

Update the and :doc:`changelog` as necessary. Ideally, this has already been
done from individual commits and pull requests, but it's good to check.


Create a release branch
-----------------------

Current practice is to bump ``kolibri.VERSION`` before tagging a release. You are allowed to have a newer version in ``kolibri.VERSION``, but you are not allowed to add the tag before actually bumping ``kolibri.VERSION``.

Select a release series number and initial version number::

    $ SERIES=0.1.x
    $ VER=0.1.0a

A quick repetition::

            0.1.x
           /  |  \
          /   |   \
         /    |    \
     major  minor   patch

The release branch ``$SERIES`` should already exist in the remote upstream,
otherwise you should create and push this branch firstly (major and
minor releases have their own release branches)::

    $ git checkout -b $SERIES upstream/master
    $ git push upstream $SERIES


Set the version in the release branch::

    $ # edit VERSION in kolibri/__init__.py
    $ git add kolibri/__init__.py
    $ git commit -m "Bump version to $VER"

Set the version number in the develop branch *if necessary*.

Push your changes to Github::

    $ git push origin releases/$SERIES


Check list before releasing
---------------------------

Before a stable release, make sure that:

 * Migrations are squashed
 * Dependencies are up to date


Tag the release
---------------

We always add git tags to a commit that makes it to a final or pre release. A
tag is prefixed ``v`` and follows the Semver convention,
for instance ``v1.2.3-alpha.1``.

.. warning:: Always add tags in **release branches**. Otherwise, the tag
    chronology will break. Do not add tags in feature branches or in the master
    branch. You can add tags for pre-releases in ``develop``, provided that it
    is tacking a series that doesn't yet have a release branch.

Tag naming conventions
~~~~~~~~~~~~~~~~~~~~~~

Tags are named like this:

 * ``releases/stable/x.y.z``
 * ``releases/alpha/x.y.z-alpha.n``
 * ``releases/beta/x.y.z-beta.n``
 * ``releases/rc/x.y.z-rc.n``


How to tag
~~~~~~~~~~

Select a series to release from and version number::

    $ SERIES=A.B.x
    $ VER=releases/stable/A.B.C
    $ NEXTVER=releases/alpha/A.B.C-alpha.0

Bump version immediately prior to release and tag the commit, signing your
tag::

    $ git checkout releases/$SERIES
    $ # edit VERSION in kolibri/__init__.py
    $ git add kolibri/__init__.py
    $ git commit -m "Bump version to $VER"
    $ git tag -s $VER

If it's a stable release, remember to bump version number on release branch
for subsequent releases to be the correct development version. For instance,
if you released ``1.2.3``, you should change the version tuple to be
``(1, 2, 3, 'alpha', 0)``. You should also add a new section to the change
log::

    $ # edit VERSION in kolibri/__init__.py
    $ # edit CHANGELOG.rst
    $ git add CHANGELOG.rst kolibri/__init__.py
    $ git commit -m "Switch to track development versions $NEXTVER"
    $ git tag -s $NEXTVER  # If 'alpha.0' not in $NEXTVER

Merge to master *if this is a stable release in the latest release series*::

    $ git checkout master
    $ git merge v$VER

Push your changes to Github (don't forget to push the new tag)::

    $ git push
    $ git push upstream --tags


Release to PyPI
---------------

Select the version number and checkout the exact git tag::

    $ VER=0.1.0
    $ git checkout v$VER

Release with PyPI using the make command::

    $ make release

Declare victory.


More on version numbers
-----------------------

.. note:: The content below is pulled from the docstring of the ``kolibri.utils.version`` module.

.. automodule:: kolibri.utils.version
  :undoc-members:
  :show-inheritance:

