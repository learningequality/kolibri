.. _release_process:

Release process
===============

Branches and tags
-----------------

* The ``master`` branch always has the latest **stable**  + **released** code
* The ``develop`` branch is our current development branch, it does not track any released code. Once a branch enters a pre-release phase, it should branch off ``develop`` and in to release branches...
* Release branches track minor releases. The branches are named like ``release-v1.2.x`` (for example), which denotes that releases are tracked in the ``1.2`` release line. This may include multiple patch releases and pre-releases (like ``v1.2.0``, ``v1.2.1``, ``v1.2.1-beta1`` etc)
* Tags named like  like ``v1.2.0-beta1`` and ``v1.2.0`` label specific releases and are tracked in their release branches.

.. note::
  At a high level, we follow the 'Gitflow' model. Some helpful references: `Original reference <http://nvie.com/posts/a-successful-git-branching-model/>`_, `Atlassian <https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow/>`_


If a change needs to be introduced to an old release, target **the oldest release branch** that you want a bug fix introduced in. Then that will be merged into all later releases, including develop.

When we get close to releasing a new stable version/release of Kolibri, we generally branch ``develop`` into something like ``release-v0.1.x`` and tag it as a new beta. If you're working on an issue targetted with that milestone, then you should target changes to that branch. Changes to those branches will later be pulled into ``develop`` again.

If you're not sure which branch to target, ask the dev team!


Process
-------

Update the Changelog
~~~~~~~~~~~~~~~~~~~~

Update the :doc:`changelog` as necessary. In general we should try to keep the changelog up-to-date as PRs are merged in; however in practice the changelog usually needs to be cleaned up, fleshed out, and clarified.

Our changelogs should list:

* significant new features that were added
* significant categories of bug fixes or user-facing improvements
* significant behind-the-scenes technical improvements

Keep entries concise and consistent with the established writing style. The changelog should not include an entry for every PR or every issue closed. Reading the changelog should give a quick, high-level, semi-technical summary of what has changed.

Note that for older patch releases, the change should only be mentioned once: it is implied that fixes in older releases are propagated forward.


Create a release branch
~~~~~~~~~~~~~~~~~~~~~~~

If this is a new major or minor release, you need to make a new branch as described above.


Pin installer versions
~~~~~~~~~~~~~~~~~~~~~~

On Kolibri's ``develop`` branch, we sometimes allow the installers to track the latest development versions on github. Before releasing Kolibri, we need to pin the Buildkite configuration to a tagged version of each installer.


Update any translation files
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

If string interface text has changed, or more complete translations are available, translation files should be updated.
This is currently done by running the ``make downloadmessages`` command. Following this, the specific files that have been updated with approved translations will need to be added to the repository.

Caveats:

* The crowdin utility that this command invokes requires java, so you may need to run them in an ubuntu VM
* You might need to manually install the crowdin debian package if the jar isn't working for you
* The command might not be compatible with non-bash shells
* You might be better off composing the crowdin commands manually, especially if your checked out branch is not a release branch
* By default Crowdin will download all translations, not just approved ones, and will often download untranslated strings also. Do not just add all the files that are downloaded when ``make downloadmessages`` is run, as this will lead to untranslated and poor quality strings being included.

If you need to add a new interface language to Kolibri, please see :ref:`new_language` for details.

Finally, strings for any external Kolibri plugins (like kolibri-exercise-perseus-renderer) should also have been updated, a new release made, and the version updated in Kolibri. See the README of that repository for details.


Squash migrations
~~~~~~~~~~~~~~~~~

When possible, we like to utilize the Django migration squashing to simplify the migration path for new users (while simultaneously maintaining the migration path for old users). So far this has not been done, due to the existence of data migrations in our migration history. Once we have upgraded to Django 1.11, we will be able to mark these data migrations as elidable, and we will be able to better squash our history.


Ensure bugfixes from internal depencies have propagated
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Some issues in Kolibri arise due to our integration of internally produced, but external to Kolibri, packages, such as kolibri-exercise-perseus-renderer, iceqube, and morango. If any of these kinds of dependencies have been updated to fix issues for this milestone, then the dependency version should have been updated.


Bump the version
~~~~~~~~~~~~~~~~

.. note:: This applies to all releases, both stable and pre-releases. Anything that's released should be tracked in a release branch.

Current practice is to bump ``kolibri.VERSION`` before tagging a release. You are allowed to have a newer version in ``kolibri.VERSION``, but you are not allowed to add the tag before actually bumping ``kolibri.VERSION``.

The form is of the ``kolibri.VERSION`` tuple is::

          (0, 1, x, suffix, 0)
           /  |   \    \     \
          /   |    \    \     +----+
         /    |     \    \          \
     major  minor  patch  a/b/rc   suffix release
     
     a=alpha
     b=beta
     rc=release candidate
     post=post release (no source changes)

Set the version in the release branch::

    $ # edit VERSION in kolibri/__init__.py
    $ git add kolibri/__init__.py
    $ git commit -m "Bump version to $VER"

Create a pull request on Github to get sign off for the release, create test builds etc. Target the release branch, not ``master`` or ``develop``!

Checklist for sign off:

- [ ] Translation files have been updated
- [ ] Migrations have been squashed where possible
- [ ] Changelog has been updated
- [ ] LE Dependencies properly updated
- [ ] Tested Debian Installer
- [ ] Tested Windows Installer
- [ ] Tested PEX File


Tag the release
~~~~~~~~~~~~~~~

Once the release PR is merged to a release branch, you can add a tag and create the Github release entry.

We always add git tags to a commit that makes it to a final or pre-release. A
tag is prefixed ``v`` and follows the Semver convention,
for instance ``v1.2.3-alpha1``.

Tag the release using github's `Releases feature <https://github.com/learningequality/kolibri/releases>`_.

Once a stable release is tagged, delete pre-releases (not the tags themselves) from github.

Copy the entries from the changelog into Github's "Release notes".

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

Post-release TODO
~~~~~~~~~~~~~~~~~

Most of these TODOs are targeted towards more public distribution of Kolibri, and as such have not been widely implemented in the past. Once Kolibri is publicly released, these will be increasingly important to support our community.

* Release on PyPI
* Update any redirects on learningequality.org for the latest release.
* Announce release on dev list and newsletter if appropriate.
* Close, if fixed, or change milestone of any issues on this release milestone.
* Close this milestone.
* For issues on this milestone that have been reported by the community, respond on the issues or other channels, notifying of the release that fixes this issues.


More on version numbers
-----------------------

.. note:: The content below is pulled from the docstring of the ``kolibri.utils.version`` module.

.. automodule:: kolibri.utils.version
  :undoc-members:
  :show-inheritance:

