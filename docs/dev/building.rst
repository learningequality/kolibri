Building the Python Package
===========================

The Kolibri Package build pipeline looks like this::

                        Git master branch
                                |
                                |
                               / \
                              /   \
    Python dist with dependencies  \
    `python setup.py bdist_wheel`   \
                /                    \
               /                Python dist with bundled dependencies
        Upload to PyPi          `python setup.py bdist_wheel --static`
       Installable with                 \
     `pip install kolibri`               \
                                    Upload to PyPi
                                    Installable with
                              `pip install kolibri-static`
                                /            |          \
                               /             |           \
                         Windows            OSX        Debian
                        installer         installer   installer


Make targets
------------

To build both the slim Kolibri and the one with bundled dependencies, simply
run `make sdist`. The `.whl` files will now be available in `dist/*whl` and
you can install them with `pip install dist/filename.whl`.

Automated CI tests
------------------

If you add `[ setup ]` to your commit message, our CI will automatically test
that builds work.

Otherwise, changes to certain files like `requirements/*` and `setup.py` will
automatically prompt test builds to fire.
