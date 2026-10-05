
.. _build_pipeline:

Distribution build pipeline
===========================

The Kolibri Package build pipeline looks like this::

                        Git release branch
                                |
                                |
                               / \
                              /   \
 Python dist, online dependencies  \
    `python setup.py bdist_wheel`   \
                /                    \
               /                Python dist, bundled dependencies
        Upload to PyPi        `python setup.py bdist_wheel --static`
       Installable with                 \
     `pip install kolibri`               \
                                    Upload to PyPi
                                    Installable with
                              `pip install kolibri-static`
                                /            |          \
                               /             |           \
                         Windows          Android        Debian
                        installer           APK         installer


Make targets
------------

- To build a wheel file, run ``make dist``
- To build a pex file, run ``make pex`` after ``make dist``
- Platform distributions are built with GitHub Actions:
  `pr_build_kolibri.yml <https://github.com/learningequality/kolibri/blob/develop/.github/workflows/pr_build_kolibri.yml>`__
  creates pull request artifacts and
  `release_kolibri.yml <https://github.com/learningequality/kolibri/blob/develop/.github/workflows/release_kolibri.yml>`__
  creates release distributions. Platform-specific sources live under ``platforms/`` for
  `Windows and macOS <https://github.com/learningequality/kolibri/tree/develop/platforms/desktop-app>`__,
  `Debian <https://github.com/learningequality/kolibri/tree/develop/platforms/debian>`__,
  `Android <https://github.com/learningequality/kolibri/tree/develop/platforms/android>`__,
  `Raspberry Pi <https://github.com/learningequality/kolibri/tree/develop/platforms/raspberry-pi>`__, and
  `Flatpak <https://github.com/learningequality/kolibri/tree/develop/platforms/flatpak-app>`__.


More on version numbers
-----------------------

.. note:: The content below is pulled from the docstring of the ``kolibri.utils.version`` module.

.. automodule:: kolibri.utils.version
  :undoc-members:
  :show-inheritance:


.. warning:: Tagging is known to break after rebasing, so in case you rebase
    a branch after tagging it, delete the tag and add it again. Basically,
    ``git describe --tags`` detects the closest tag, but after a rebase, its
    concept of distance is misguided.
