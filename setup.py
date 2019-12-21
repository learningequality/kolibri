#!/usr/bin/env python
# -*- coding: utf-8 -*-
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import os

from setuptools import setup
from setuptools.command.install_scripts import install_scripts

import kolibri

# Windows-specific .bat script template
WINDOWS_BATCH_TEMPLATE = r"""@echo off
set mypath=%~dp0
set pyscript="%mypath%{file_name}"
set /p line1=<%pyscript%
if "%line1:~0,2%" == "#!" (goto :goodstart)
echo First line of %pyscript% does not start with "#!"
exit /b 1
:goodstart
set py_exe=%line1:~2%
call %py_exe% %pyscript% %*
"""


# Generate Windows-specific .bat files
class gen_windows_batch_files(install_scripts):
    def run(self):
        # default behaviors
        install_scripts.run(self)

        # Nothing more to do if this is not Windows
        if not os.name == "nt":
            return

        # For Windows, write batch scripts for all executable python files
        for output_path in self.get_outputs():
            # look for #! at the top
            with open(output_path, "rt") as f:
                first_line = f.readline()
            # skip non-executbale python files
            if not (first_line.startswith("#!") and "python" in first_line.lower()):
                continue
            path_name, file_name = os.path.split(output_path)
            if self.dry_run:
                continue
            bat_file = os.path.join(path_name, os.path.splitext(file_name)[0] + ".bat")
            with open(bat_file, "wt") as f:
                f.write(WINDOWS_BATCH_TEMPLATE.format(file_name=file_name))


long_description = """
`Kolibri <https://learningequality.org/kolibri/>`_ is the offline learning platform
from `Learning Equality <https://learningequality.org/>`_.

This package can be installed by running ``pip install --user kolibri``. `See the download
page <https://learningequality.org/download/>`_ for other methods of installation.

- `View the documentation <https://kolibri.readthedocs.io/>`_ and the `community
  forums <https://community.learningequality.org/>`_ for more guidance on setting up
  and using Kolibri
- Visit the `Github project <https://github.com/learningequality/kolibri>`_ and the
  `developer documentation <https://kolibri-dev.readthedocs.io/>`_ if you would like
  to contribute to development
"""


setup(
    name="kolibri",
    version=kolibri.__version__,
    description="Kolibri - the offline app for universal education",
    long_description=long_description,
    author="Learning Equality",
    author_email="info@learningequality.org",
    url="https://github.com/learningequality/kolibri",
    packages=[str("kolibri")],  # https://github.com/pypa/setuptools/pull/597
    entry_points={
        "console_scripts": ["kolibri = kolibri.utils.cli:main"],
        "kolibri.plugins": [
            "{module_path} = {module_path}".format(module_path=module_path)
            for module_path in kolibri.INTERNAL_PLUGINS
        ],
    },
    package_dir={"kolibri": "kolibri"},
    include_package_data=True,
    install_requires=[],
    dependency_links=[],
    tests_require=["pytest", "tox", "flake8"],
    license="MIT",
    zip_safe=False,
    keywords=["education", "offline", "kolibri"],
    classifiers=[
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Natural Language :: English",
        "Development Status :: 4 - Beta",
        "Programming Language :: Python :: 2",
        "Programming Language :: Python :: 2.7",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.3",
        "Programming Language :: Python :: 3.4",
        "Programming Language :: Python :: 3.5",
        "Programming Language :: Python :: 3.6",
        "Programming Language :: Python :: Implementation :: PyPy",
    ],
    cmdclass={"install_scripts": gen_windows_batch_files},
)
