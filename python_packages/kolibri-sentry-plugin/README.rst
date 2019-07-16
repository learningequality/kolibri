
Kolibri External Plugin Template
=================================


How can I install this plugin?
------------------------------

1. Inside your Kolibri virtual environment:
    ``pip install kolibri_sentry_plugin``

2. Activate the plugin:

    ``kolibri plugin kolibri_sentry_plugin enable``

3. Restart Kolibri.

How can I install this plugin for development?
------------------------------

1. Download this repo.

2. Open terminal in your Kolibri repo.

3. run the following commands:

    ``pip install -e <LOCAL-PATH-TO-REPO>``

    ``kolibri plugin kolibri_sentry_plugin enable``


4. Then run the commands to install frontend packages in Kolibri, this plugin will have its dependencies recursively installed.


How to publish to PyPi?
------------------------------

1. Follow the instructions above to install the plugin for development.


2. From the Kolibri directory run the frontend build command.


3. Update `setup.py` to a newer version.

4. In the terminal move to the root level of repo dir and run the following command to publish to PyPi:

    ``make release``


What is Kolibri?
----------------

Kolibri is a Learning Management System / Learning App designed to run on low-power devices, targeting the needs of
learners and teachers in contexts with limited infrastructure. A user can install Kolibri and serve the app on a local
network, without an internet connection. Kolibri installations can be linked to one another, so that user data and
content can be shared. Users can create content for Kolibri and share it when there is network access to another
Kolibri installation or the internet.

At its core, Kolibri is about serving educational content. A typical user (called a Learner) will log in to Kolibri
to consume educational content (videos, documents, other multimedia) and test their understanding of the content by
completing exercises and quizzes, with immediate feedback. A user’s activity will be tracked to offer individualized
insight (like "next lesson" recommendations), and to allow user data to be synced across different installations --
thus a Kolibri learner can use his or her credentials on any linked Kolibri installation, for instance on different
devices at a school.

See https://learningequality.org/kolibri/ for more info.


How can I contribute?
---------------------

 * `Documentation <http://kolibri.readthedocs.org/en/latest/>`_ is available online, and in the ``docs/`` directory.
 * Mailing list: `Google groups <https://groups.google.com/a/learningequality.org/forum/#!forum/dev>`_.
 * IRC: #kolibri on Freenode
