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

Update the :ref:`changelog` as necessary. In general we should try to keep the changelog up-to-date as PRs are merged in; however in practice the changelog usually needs to be cleaned up, fleshed out, and clarified.

Our changelogs should list:

* significant new features that were added
* significant categories of bug fixes or user-facing improvements
* significant behind-the-scenes technical improvements

Keep entries concise and consistent with the established writing style. The changelog should not include an entry for every PR or every issue closed. Reading the changelog should give a quick, high-level, semi-technical summary of what has changed.

Note that for older patch releases, the change should only be mentioned once: it is implied that fixes in older releases are propagated forward.

Additionally, we should also be adding the 'changelog' label to issues and pull requests on github. A more technical and granular overview of changes can be obtained by filtering by milestone and the 'changelog' label. Go through these issues and PRs, and ensure that the titles would be clear and meaningful.


Create a release branch
~~~~~~~~~~~~~~~~~~~~~~~

If this is a new major or minor release, you need to make a new branch as described above.


Pin installer versions
~~~~~~~~~~~~~~~~~~~~~~

On Kolibri's ``develop`` branch, we sometimes allow the installers to track the latest development versions on github. Before releasing Kolibri, we need to pin the Buildkite configuration to a tagged version of each installer.


Update any translation files
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Make sure that the latest released translations are included for the appropriate release branch. Please see :ref:`crowdin` for details.

Finally, strings for any external Kolibri plugins (like ``kolibri-exercise-perseus-renderer``) should also have been updated, a new release made, and the version updated in Kolibri. See the README of that repository for details.


Squash migrations
~~~~~~~~~~~~~~~~~

When possible, we like to utilize the Django migration squashing to simplify the migration path for new users (while simultaneously maintaining the migration path for old users). So far this has not been done, due to the existence of data migrations in our migration history. Once we have upgraded to Django 1.11, we will be able to mark these data migrations as elidable, and we will be able to better squash our history.


Ensure bugfixes from internal depencies have propagated
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Some issues in Kolibri arise due to our integration of internally produced, but external to Kolibri, packages, such as kolibri-exercise-perseus-renderer, iceqube, and morango. If any of these kinds of dependencies have been updated to fix issues for this milestone, then the dependency version should have been updated.


Edit the VERSION file
~~~~~~~~~~~~~~~~~~~~~

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

Create a pull request on Github to get sign off for the release.

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

We always add git tags to a commit that makes it to a final or pre release. A
tag is prefixed ``v`` and follows the Semver convention,
for instance ``v1.2.3-alpha1``.

Tag the release using github's `Releases feature <https://github.com/learningequality/kolibri/releases>`_.

Once a stable release is tagged, delete pre-releases (not the tags themselves) from github.

Copy the entries from the changelog into Github's "Release notes".

.. warning:: Always add tags in **release branches**. Otherwise, the tag
    chronology will break. Do not add tags in feature branches or in the master
    branch. You can add tags for pre-releases in ``develop``, for releases that don't yet have a release branch.

.. warning:: Tagging is known to break after rebasing, so in case you rebase
    a branch after tagging it, delete the tag and add it again. Basically,
    ``git describe --tags`` detects the closest tag, but after a rebase, its
    concept of distance is misguided.


Update version data
~~~~~~~~~~~~~~~~~~~

* Merge the release branch to current master if it's the newest stable release.
* Change ``kolibri.VERSION`` to track the next development stage. Example: After releasing ``1.0.0``, change ``kolibri.VERSION`` to ``(1, 0, 1, 'alpha', 0)`` and commit to the ``release-v1.0.x`` branch.


Update milestone
~~~~~~~~~~~~~~~~

* Close, if fixed, or change milestone of any issues on this release milestone.
* Close this milestone.


Release to PyPI
~~~~~~~~~~~~~~~

Select the version number and checkout the exact git tag::

    $ VER=0.1.0
    $ git checkout v$VER

Release with PyPI using the make command::

    $ make release




Sign Windows installer
~~~~~~~~~~~~~~~~~~~~~~

Use ``osslsigncode`` to sign the windows installer::

    $ osslsigncode verify KolibriSetup-0.6.2.signed.exe

Sign and update the Debian PPA
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

[ TODO ]

Upload Windows installer and PEX file
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Upload the PEX file and the signed windows installer to:

 * ``/var/www/downloads/kolibri/vX.Y.Z/kolibri-vX.Y.Z.pex``
 * ``/var/www/downloads/kolibri/vX.Y.Z/kolibri-vX.Y.Z-windows-installer.exe``

Make sure the files and parent directories are owned by the ``www-data`` user, e.g. by running::

    sudo chown www-data:www-data [filename]

Update the online demo
~~~~~~~~~~~~~~~~~~~~~~

Get ``kolibridemo.learningequality.org`` running the latest version:

 * SSH into ``192.237.248.135``
 * ``sudo su www-data``
 * ``cd ~/``
 * download new pex file and update the correct ``run...sh`` script

Then...::

    sudo -i -u aron
    killall python
    run_all

Update learningequality.org
~~~~~~~~~~~~~~~~~~~~~~~~~~~

Update learningequality.org with the latest version number and release date. Currently, these two files need to be changed:

 * ``fle_site/apps/main/templates/main/documentation.html``
 * ``fle_site/apps/main/templates/main/download.html``

Also, update the ``LATEST_KOLIBRI_VERSION`` variable at `this admin site <http://learningequality.org/admin/redirects/redirectvariable/>`_.

Notifications
~~~~~~~~~~~~~

Tell the world!

[ TODO ]

* Announce release on dev list and newsletter if appropriate.
* For issues on this milestone that have been reported by the community, respond on the issues or other channels, notifying of the release that fixes this issues.



More on version numbers
-----------------------

.. note:: The content below is pulled from the docstring of the ``kolibri.utils.version`` module.

.. automodule:: kolibri.utils.version
  :undoc-members:
  :show-inheritance:

