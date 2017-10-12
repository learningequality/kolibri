.. _release_process:

Release process
===============

Branches and tags
-----------------

* The ``master`` branch always has the latest stable code
* The ``develop`` branch is our current development branch
* Branches named like ``release-v1.2.x`` (for example) track all releases of the 1.2 release line. This may include multiple patch releases (like v1.2.0, v1.2.1, etc)
* Tags named like  like ``v1.2.0-beta1`` and ``v1.2.0`` label specific releases


.. note::
  At a high level, we follow the 'Gitflow' model. Some helpful references: `Original reference <http://nvie.com/posts/a-successful-git-branching-model/>`_, `Atlassian <https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow/>`_


If a change needs to be introduced to an old release, target **the oldest release branch** that you want a bug fix introduced in. Then that will be merged into all later releases, including develop.

When we get close to releasing a new stable version/release of Kolibri, we generally branch ``develop`` into something like ``release-v0.1.x`` and tag it as a new beta. If you're working on an issue targetted with that milestone, then you should target changes to that branch. Changes to those branches will later be pulled into ``develop`` again.

If you're not sure which branch to target, ask the dev team!


Process
-------

Update the Changelog
~~~~~~~~~~~~~~~~~~~~

Update the and :doc:`changelog` as necessary. Ideally, this has already been
done from individual commits and pull requests, but it's good to check.


Create a release branch
~~~~~~~~~~~~~~~~~~~~~~~

If this is a new major or minor release, you need to make a new branch as described above.


Edit the VERSION file
~~~~~~~~~~~~~~~~~~~~~

Current practice is to bump ``kolibri.VERSION`` before tagging a release. You are allowed to have a newer version in ``kolibri.VERSION``, but you are not allowed to add the tag before actually bumping ``kolibri.VERSION``.

Current practice is to bump ``kolibri.VERSION`` before tagging a release. You are allowed to have a newer version in ``kolibri.VERSION``, but you are not allowed to add the tag before actually bumping ``kolibri.VERSION``.

Select a release series number and initial version number::

    $ SERIES=0.1.x
    $ VER=0.1.0a

The form is::

            0.1.x
           /  |  \
          /   |   \
         /    |    \
     major  minor   patch


Set the version in the release branch::

    $ # edit VERSION in kolibri/__init__.py
    $ git add kolibri/__init__.py
    $ git commit -m "Bump version to $VER"

Set the version number in the develop branch *if necessary*.

Push your changes to Github.


Squash migrations
~~~~~~~~~~~~~~~~~

(explain here)


Tag the release
~~~~~~~~~~~~~~~

We always add git tags to a commit that makes it to a final or pre release. A
tag is prefixed ``v`` and follows the Semver convention,
for instance ``v1.2.3-alpha1``.

Tag the release using github's `Releases feature <https://github.com/learningequality/kolibri/releases>`_.

.. warning:: Always add tags in **release branches**. Otherwise, the tag
    chronology will break. Do not add tags in feature branches or in the master
    branch. You can add tags for pre-releases in ``develop``, for releases that don't yet have a release branch.


Release to PyPI
~~~~~~~~~~~~~~~

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

