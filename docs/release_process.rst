.. _release_process:

Release process
===============

These instructions follow the hypothetical release of Kolibri version '0.3.0'.

In this case, the repo would currently have a ``develop`` branch and a number of pre-existing release branches, the most recent being ``release-v0.2.x`` with potentially multiple tags for patch releases, e.g. ``v0.2.0`` and ``v0.2.1``.

Patch releases (e.g. '0.3.1') follow the same process outlined below, except that development occurs exclusively on an existing release branch (e.g. ``release-v0.2.x``). Patch releases generally do not have new user-facing strings, so translation- and font-related steps can be skipped


Create alpha releases
---------------------

For the majority of development on a new release, PRs will target the ``develop`` branch. Tag alpha releases as desired using Github's `Releases <https://github.com/learningequality/kolibri/releases>`__ functionality, which both adds a tag to the git repo and creates a placeholder on the Github site with built distributions.

Make sure to target ``develop``, use the standard tag naming convention (e.g. ``v0.3.0-alpha1``), and mark it has a "pre-release".

These alphas can be used for preliminary testing as major, unstable updates are introduced.

When a new alpha is published, *delete any older alphas* using Github's 'delete release' functionality. This will *not* delete the git tag.

It's common that changes have been made in the previous release that need to be propagated to the current release. For an upcoming 0.3.0 release, we would need to merge ``release-v0.2.x`` into ``develop``.

During the alpha phase is all the period when we should update our Python and Javascript dependencies. In general we should avoid updating dependencies in release branches.


String freeze and translation
-----------------------------

Once we are close to stabilizing the UI, we should schedule a string freeze. This date is the time after which no user-facing text in the application can be changed, because after string freeze we will begin getting quotes from translators and initiating the translation process.

Each minor release (``N.N.*``) is maintained in a CrowdIn Version Branch, following the existing naming scheme ``release-vN.N.x``. The branch is automatically created when running the first ``make i18n-upload`` command. CrowdIn will automatically reuse previously translated strings in new branches.

On the string freeze date, the strings for the upcoming release should be uploaded to crowdin as described in :ref:`crowdin`. You can run ``make i18n-stats branch=<release-vN.N.x>`` to get figures on the translation work. Send the stats to the i18n team, whom can use them for communication with translators to measure the translation efforts needed.

Strings from the Perseus plugin should also be revisited. They are maintained in the repo `learningequality/kolibri-exercise-perseus-plugin <https://github.com/learningequality/kolibri-exercise-perseus-plugin>`__, but the source strings are generated and uploaded through the main ``kolibri`` project. The translated files from CrowdIn such as ``kolibri_exercise_perseus_plugin.exercise_perseus_render_module-messages.json`` are downloaded through the ``kolibri-exercise-perseus-plugin`` project. For instructions, see :ref:`crowdin`.

Before the translation start date, provide time to do one final review of all user-facing strings. This can be done e.g. in the course of doing a preliminary translation into Spanish.

When the user-facing strings have been signed off, the i18n team should notify translators that translation can begin.


Pin internal dependencies
-------------------------

Make sure all our internal dependencies are pointing at the correct, published versions. Specifically check:

* Morango
* LE Utils
* Perseus plugin
* Windows installer

Test to ensure that changes have propagated as expected.


Create a release branch
-----------------------

When we're nearing the end of major new feature development, cut a new release branch. If we're getting ready to release version 0.3.0, we'd do the following steps:

* Create new branch off of ``develop`` with a name like ``release-v0.3.x``
* Set up `branch protections <https://help.github.com/articles/about-protected-branches/>`__ in Github using the same settings as ``develop``
* Re-target any outstanding PRs for this release from ``develop`` to ``release-v0.3.x``

Next, a couple book-keeping steps are necessary. The ``VERSION`` variable in *__init__.py* should currently be ``(0, 2, 0, 'alpha', 1)`` in both the  ``release-v0.3.x`` and ``develop`` branches.

* In ``develop``, update the first three values from ``0, 2, 0`` to ``0, 3, 0``
* In ``release-v0.3.x``, bump fourth value: ``'alpha'`` to  ``'beta'``

These changes can be merged by a Github admin without code review.

Finally, tag the first beta using Github's `Releases <https://github.com/learningequality/kolibri/releases>`__ functionality. Target the ``release-v0.3.x`` branch, use the standard tag naming convention (``v0.3.0-beta1``), and mark it has a "pre-release".


Integration testing and beta releases
-------------------------------------

Thoroughly test user stories, browsers, and operating systems. Update gherkin story test matrices, test performance, have bug bashes...

As fixes are made, release a new beta every few days.

For every beta release:

* Publish Python package to PyPi
* Publish Debian packages to ``kolibri-proposed``
* Update `translations.learningequality.org <http://translations.learningequality.org>`__
* Update `kolibri-beta.learningequality.org <http://kolibri-beta.learningequality.org>`__


Tag beta releases as desired using Github's `Releases <https://github.com/learningequality/kolibri/releases>`__ functionality, which both adds a tag to the git repo and creates a placeholder on the Github site with built distributions.

Make sure to target tags to the release branch. For example, for 0.3.0 betas, target ``release-v0.3.x``. Use the standard tag naming convention (e.g. ``v0.3.0-beta1``), and mark it has a "pre-release" in the Github UI.

These betas should be used for end-to-end testing as final, stabilizing changes are introduced. Risky changes should be avoided during the beta stage unless a critical issue is identified with no straightforward fix.

When a new beta is published, delete any older betas using Github's 'delete release' functionality. This will *not* delete the git tag. Update `kolibribeta.learningequality.org <http://kolibribeta.learningequality.org/>`__ with the latest beta, and notify the team on Slack when new betas are available.

At this point, updates to the `user documentation <https://github.com/learningequality/kolibri-docs/>`__ can also begin.


Update with final translations
------------------------------

* Determine which languages are ready for inclusion
* Download all strings for supported languages in Kolibri and Perseus
* Re-publish Perseus if necessary, and update the Kolibri dependency reference
* Test that all languages render properly

See :ref:`crowdin` for more information.


Merge in previous release again
-------------------------------

Check one last time if there were any last-minute changes to the previous release branch that need to be merged into the current release branch. For example in preparation for 0.3.0, we would need to merge ``release-v0.2.x`` into ``release-v0.3.x``.


Triage open PRs and issues
--------------------------

Check the current Github milestone for any outstanding PRs or issues. If there are any that cannot be closed or merged before release, either clear the milestone or re-target them to the next milestone.

This could either be a patch of the current release or the next 'major' release.


Update the Changelog
--------------------

Update the :ref:`changelog` as necessary. In general we should try to keep the changelog up-to-date as PRs are merged in; however in practice the changelog usually needs to be cleaned up, fleshed out, and clarified.

Our changelogs should list:

* significant new features that were added
* significant categories of bug fixes or user-facing improvements
* significant behind-the-scenes technical improvements

Keep entries concise and consistent with the established writing style. The changelog should not include an entry for every PR or every issue closed. Reading the changelog should give a quick, high-level, semi-technical summary of what has changed.

Note that for older patch releases, the change should only be mentioned once: it is implied that fixes in older releases are propagated forward.

Additionally, we should also be adding the 'changelog' label to issues and pull requests on Github. A more technical and granular overview of changes can be obtained by filtering by milestone and the 'changelog' label. Go through these issues and PRs, and ensure that the titles would be clear and meaningful.

Ensure the link to Github changelog label+milestone is correct.


Prepare blog post
-----------------

Draft a blog post on Medium containing highlights of the release. This can be kept hidden until it's time to update the website as outlined below.


Create the final release
------------------------

Before proceeding, tag and build one last beta, and run through the most critical user stories to ensure that there are no glaring issues. If that checks out, it's time to create the final release.

For example, if we were releasing version 0.3.0, we would perform these steps:

* The ``VERSION`` variable in *__init__.py* should currently be ``(0, 3, 0, 'beta', 1)`` in ``release-v0.3.x``
* Update this to be ``(0, 3, 0, 'final', 0)`` (no code review necessary)
* Tag the final release as ``v0.3.0`` targetting the ``release-v0.3.x`` branch using Github's `Releases <https://github.com/learningequality/kolibri/releases>`__ functionality.
* Copy the entries from the changelog into Github's "Release notes" and ensure that the formatting and links are correct.
* Delete the most recent beta pre-lease on github.
* Update ``VERSION`` in ``release-v0.3.x`` to be ``(0, 3, 1, 'beta', 0)`` (no code review necessary)

At this point, all changes to the git tree are complete for the release.


Publish to PyPI
---------------

Releasing to PyPI marks the "no turning back" moment of a release because releases cannot be removed – only added. Make sure that the correct tag is checked out and that the git tree has no local changes.

If this were version 0.3.0 we would do:

.. code-block:: bash

    $ git reset --hard v0.3.0

Then sign the release and upload it:

.. code-block:: bash

    $ make release

Confirm that the release is uploaded to `PyPi <https://pypi.org/>`__, and try installing it and running it on a few operating systems with both Python 2 and Python 3.


Generate, test, and publish distributions
-----------------------------------------

When uploading files to the Pantry server, put them in a directory of the form ``/var/www/downloads/kolibri/vX.Y.Z/``.

Make sure the files and parent directories are owned by the ``www-data`` user, e.g. by running ``sudo chown www-data:www-data [filename]``


For the example of version 0.3.0 we would do the following:

* Pex
   * Test that .pex works and version info is correct
   * Upload .pex to Pantry as ``kolibri-v0.3.0.pex``
* Debian
   * Build and sign Debian package
   * Test that .deb works and that version is correct
   * Publish package to our PPA
   * Upload .deb to Pantry as ``kolibri_0.3.0-0ubuntu1_all.deb``
   * Note that if another Debian build is necessary, ``ubuntu1`` can be incremented
* Windows
   * Sign Windows installer
   * Test that .exe works and that version is correct
   * Upload .exe to Pantry as ``kolibri-v0.3.0-windows-installer.exe``


Update `learningequality.org/download <https://learningequality.org/download/>`__ to point to the latest release by updating variables in the Admin page. Log in and navigate to:

    `Admin <https://learningequality.org/admin/>`__ → Redirects → Redirect variables

Update the following variables:

* ``LATEST_KOLIBRI_VERSION``
* ``LATEST_KOLIBRI_SUPPORTED_LANGUAGES``
* ``LATEST_KOLIBRI_RELEASE_DATE``
* ``LATEST_KOLIBRI_DEBIAN_VERSION_COMPONENT``
* ``LATEST_KOLIBRI_BLOG_URL``

Publish the Medium post if necessary.

.. note :: An Android APK is automatically generated and signed whenever the release pipeline is unblocked past the per-PR "cleanup" phase. These, however, are not publicly distributed to Pantry or the `learningequality.org/download <https://learningequality.org/download/>`__ page at the moment.


Update the demo server
----------------------

Get `kolibridemo.learningequality.org <https://kolibridemo.learningequality.org>`__ running the latest version:

* SSH into the instance by running ``gcloud compute ssh --project kolibri-demo-servers --zone us-east1-d kolibridemo``. Click `here <https://cloud.google.com/compute/docs/instances/connecting-to-instance#gcetools>`__ for more information about connecting to Google Compute Engine instances. (You will need the right permissions of course.)
* ``sudo su www-data``
* Download the new .pex file from the uploaded assets on github/buildkite using ``wget``. Update /var/www/run_kolibridemo.sh to point at it
* ``./var/www/run_kolibridemo.sh restart`` to restart kolibri


Verify that `the demo server <https://kolibridemo.learningequality.org>`__ is running the latest version.


Wrap-up
-------

* Publish relevant updates to the `Toolkit <https://learningequality.org/r/toolkit>`__ and `User documentation <https://kolibri.readthedocs.io/en/latest/>`__
* `Close the milestone <https://github.com/learningequality/kolibri/milestones>`__ on Github
* For issues on this milestone that have been reported by the community, try to report in appropriate forum threads that the new release addresses the issues


Send upgrade notifications
--------------------------

Wait about 3 business days after communications are published to see if any issues are reported. Afterwards, we can send upgrade notifications through the Nutrition Facts telemetry server.

* `Log in to the telemetry server <https://telemetry.learningequality.org/account/login/google-oauth2/?next=/admin/>`__ using your Learning Equality Google Apps account
* Create a new Message object by clicking the "+ Add" button
* In the "Status" dropdown, select the "Staged" option
* Set the link URL to ``https://learningequality.org/r/upgrade_kolibri``
* In the "Version range" field, enter a valid semver range (e.g. >=0.12.0)
* Generate and add a new internationalized ``i18n`` JSON blob using the ``nutritionfacts_i18n.py`` script as shown below:

.. code-block:: bash

  python build_tools/i18n/nutritionfacts_i18n.py

You can also specify specific string IDs for the ``title``, ``msg``, and ``link_text``, e.g.:

.. code-block:: bash

  python build_tools/i18n/nutritionfacts_i18n.py --message UpdateNotification.upgradeMessage0124

This will output a JSON blob like:

.. code-block:: text

  {
    "ar": {
      "link_text": "تعلم المزيد وقم بتحميله هنا",
      "msg": "هناك إصدار جديد متاح من كوليبري.",
      "title": "التحديث للنسخة الجديدة أصبح متاحاً"
    },
    "bg-bg": {
      "link_text": "Научи повече и изтегли оттук",
      "msg": "Налична е нова версия на Колибри.",
      "title": "Има налични подобрения"
    },
    "bn-bd": {
      "link_text": "আরও জানুন এবং সেটি এখানে ডাউনলোড করুন",
      "msg": "কলিব্রির একটি নতুন সংস্করণ পাওয়া যাচ্ছে।",
      "title": "আপগ্রেড উপলব্ধ"
    },
    "en": {
      "link_text": "Learn more and download it here",
      "msg": "A new version of Kolibri is available.",
      "title": "Upgrade available"
    },
    "es-es": {
      "link_text": "Descubre más y descarga aquí",
      "msg": "Una nueva versión de Kolibri está disponible.",
      "title": "Actualización disponible"
    },
    //...
  }


You can `redirect this output to a file <https://askubuntu.com/questions/420981/how-do-i-save-terminal-output-to-a-file>`_ (Bash) or `pipe it to the clipboard <https://stackoverflow.com/questions/1753110/>`_ (Mac)

Set Kolibri's ``KOLIBRI_RUN_MODE`` to ``staged-msgs-ver-0.0.1`` to receive staged messages, as described in :ref:`EnvVars`. Test that all languages are displayed correctly.

Next, emulate different versions and ensure that the semver conditional logic is being processed correctly. Set ``KOLIBRI_RUN_MODE`` to something like ``staged-msgs-ver-0.12.3`` to emulate version 0.12.3, for example. For more information, take a look at `the function for parsing these strings <https://github.com/learningequality/nutritionfacts/blob/b150ec9fd80cd0f02c087956fd5f16b2592f94d4/nutritionfacts/views.py#L129-L149>`_.

Once testing has confirmed that the message works as expected, set the message to active to enable it.
