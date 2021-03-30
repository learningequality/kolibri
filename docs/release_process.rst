.. _release_process:

Release process
===============

We maintain a set of `release process automation scripts <https://github.com/learningequality/kolibri-release-process/>`__ (private repo) which automatically create internal next actions in `Notion <https://www.notion.so/learningequality/>`__. The processes there have separate sets of actions for:

* finals, beta, and release candidates
* major versus patch releases

Branches and tags
-----------------

The examples below follow the hypothetical release of Kolibri version '0.3.0'. In this case, recent unstable changes would be in the ``develop`` branch, and there would be a number of pre-existing release branches up to ``release-v0.2.x``. Each would have tags for patch releases, e.g. ``v0.2.0`` and ``v0.2.1``.

For the majority of development on a new release, PRs will target the ``develop`` branch. Tag alpha releases as desired using Github's `Releases <https://github.com/learningequality/kolibri/releases>`__ functionality, which both adds a tag to the git repo and creates a placeholder on the Github site with built distributions.

Make sure to target ``develop``, use the standard tag naming convention (e.g. ``v0.3.0-alpha1``), and mark it has a "pre-release".

.. note:: The latest HEAD commit of ``develop`` is automatically deployed to `kolibri-dev.learningequality.org <https://kolibri-dev.learningequality.org/>`__.

When a new alpha is published, *delete any older alphas* using Github's 'delete release' functionality. This will *not* delete the git tag.

It's common that changes have been made in the previous release that need to be propagated to the current release. For an upcoming 0.3.0 release, we would need to merge ``release-v0.2.x`` into ``develop``.

The alpha phase is the period when we should update our Python and Javascript dependencies. In general, we should avoid updating dependencies in release branches.


String chill and string freeze
------------------------------

* **String chill**: when all new and updated user-facing strings are in ``develop``, we upload them to Crowdin (see: :ref:`crowdin_upload`) and do a test translation internally. We aim to translate the strings into at least two languages at this stage, and use this opportunity to make any final updates to the English source strings.

* **String freeze**: when the internal review is finished and the user-facing strings have been signed off, the i18n team notifies external translators to begin their work. After this time, it can be highly disruptive to change English source strings because it requires communicating and coordinating with a large number of external contractors and volunteers with diverse schedules and time zones.

  .. note:: The in-context translation server `kolibri-translate.learningequality.org <http://kolibri-translate.learningequality.org/>`__ should always be available for translation efforts.

  Each minor release (``N.N.*``) is maintained in a Crowdin Version Branch, following the existing naming scheme ``release-vN.N.x``. The branch is automatically created when running the first ``make i18n-upload`` command. Crowdin will automatically reuse previously translated strings in new branches.

  The strings for the upcoming release need to be uploaded as described in :ref:`crowdin`.

  * Run ``make i18n-stats branch=<release-vN.N.x>`` to get figures on the translation work.
  * Send the stats to the i18n team, who will use them for communication with translators to measure the translation efforts needed.

  **Strings from the Perseus plugin also need to be revisited.** They are maintained in the repo `learningequality/kolibri-exercise-perseus-plugin <https://github.com/learningequality/kolibri-exercise-perseus-plugin>`__, but the source strings are generated and uploaded through the main ``kolibri`` project. The translated files from Crowdin such as ``kolibri_exercise_perseus_plugin.exercise_perseus_render_module-messages.json`` are downloaded through the ``kolibri-exercise-perseus-plugin`` project. For instructions, see :ref:`crowdin`.

  .. warning:: Strings exist in more places than just the Kolibri repo. Ensure we have translations for the Perseus plugin as well as other Crowdin projects such as Kolibri Server, and the Windows, Mac, Android, and GNOME Linux apps.

  **Don't forget to include the new version notifications!** Before the string freeze, make sure that the messages in the `UpdateNotfication.vue component <https://github.com/learningequality/kolibri/blob/781cadfce5c56911914e613ae26b3aef36bb3333/kolibri/core/assets/src/views/UpdateNotification.vue#L85-L103>`__ have been updated for the upcoming release.

  In the component's ``$trs`` options, add a new message with a key indicating the upcoming version. Provide 1-2 sentences describing the most important new features.::

    upgradeMessage_0_13_0:
      'Kolibri version 0.13.0 is available! It contains major improvements to resource management, coach tools, and much more.'


Continuing the release process
------------------------------

While translators are working, we finish final feature development and begin integration testing using our suite of Gherkin scenarios. During this period, we also perform a number of internal "bug bashes" and share beta releases externally with the community for help with review and testing.

.. note:: The latest beta releases are automatically deployed to `kolibri-beta.learningequality.org <https://kolibri-dev.learningequality.org/>`__.

The remainder of the release process is documented in structured workflows in the `Kolibri release process repo <https://github.com/learningequality/kolibri-release-process/>`__. (Note: this is currently a private repository because it interacts with internal Learning Equality systems)
