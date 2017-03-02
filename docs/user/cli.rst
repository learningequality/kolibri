The ``kolibri`` command
=======================

In addition to the docs displayed below, there are some special forms of the ``kolibri`` command:

.. code-block:: bash

  # runs the dev server and rebuild client assets when files change
  kolibri manage devserver --debug -- --webpack

  # runs the dev server and re-run client-side tests when files changes
  kolibri manage devserver --debug -- --karma

  # runs the dev server and also spawns the qcluster task queue in the background
  kolibri manage devserver --debug -- --qcluster

  # runs all of the above
  kolibri manage devserver --debug -- --webpack --karma --qcluster


.. note::

  The commands above reload the Python code on changes, but they do *not* run python tests.

.. automodule:: kolibri.utils.cli
  :undoc-members:
  :show-inheritance:
