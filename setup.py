#!/usr/bin/env python
# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function, unicode_literals

import logging
import os
import shutil
import sys

from setuptools import setup
from setuptools.command.install_scripts import install_scripts

# Notice that we dare do this during setup.py -- this enforces a special
# restraint on module initialization, namely that it shouldn't do anything
# that depends on an installed environment.
import kolibri
from kolibri import dist as kolibri_dist


def read_file(fname):
    """
    Read file and decode in py2k
    """
    if sys.version_info < (3,):
        return open(fname).read().decode("utf-8")
    return open(fname).read()

dist_name = 'kolibri-static'

readme = read_file('README.rst')
doclink = """
Documentation
-------------

The full documentation is at `http://kolibri.rtfd.org <http://kolibri.rtfd.org>`_."""

# Default description of the distributed package
description = (
    """Kolibri education platform for offline environments"""
)

# Decide if the invoked command is a request to do building
is_building_dist = any(
    [x in sys.argv for x in (
        "bdist",
        "sdist",
        "bdist_wheel",
        "bdist_deb",
        "sdist_dsc"
    )]
)

static_requirements = []
static_dir = os.path.dirname(os.path.realpath(kolibri_dist.__file__))

install_requires = []
dependency_links = []


################
# Windows code #
################
#
# Close your eyes

BAT_TEMPLATE = \
    r"""@echo off
set mypath=%~dp0
set pyscript="%mypath%{FNAME}"
set /p line1=<%pyscript%
if "%line1:~0,2%" == "#!" (goto :goodstart)
echo First line of %pyscript% does not start with "#!"
exit /b 1
:goodstart
set py_exe=%line1:~2%
call %py_exe% %pyscript% %*
"""


class bat_install_scripts(install_scripts):
    """
    Automatically creates .bat scripts for each executable distributed
    """

    def run(self):
        install_scripts.run(self)
        if not os.name == "nt":
            return
        for filepath in self.get_outputs():
            # If we can find an executable name in the #! top line of the script
            # file, make .bat wrapper for script.
            with open(filepath, 'rt') as fobj:
                first_line = fobj.readline()
            if not (first_line.startswith('#!') and
                    'python' in first_line.lower()):
                continue
            pth, fname = os.path.split(filepath)
            froot, ___ = os.path.splitext(fname)
            bat_file = os.path.join(pth, froot + '.bat')
            bat_contents = BAT_TEMPLATE.replace('{FNAME}', fname)
            if self.dry_run:
                continue
            with open(bat_file, 'wt') as fobj:
                fobj.write(bat_contents)


# You can open your eyes again
#
#####################
# END: Windows code #
#####################


######################################
# STATIC AND DYNAMIC BUILD SPECIFICS #
######################################

def enable_log_to_stdout(logname):
    """Given a log name, outputs > INFO to stdout."""
    log = logging.getLogger(logname)
    log.setLevel(logging.DEBUG)
    ch = logging.StreamHandler()
    ch.setLevel(logging.DEBUG)
    # create formatter
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    # add formatter to ch
    ch.setFormatter(formatter)
    # add ch to logger
    log.addHandler(ch)

setup(
    name=dist_name,
    version=kolibri.__version__,
    description=description,
    long_description="{readme}\n\n{doclink}".format(
        readme=readme,
        doclink=doclink
    ),
    author='Learning Equality',
    author_email='info@learningequality.org',
    url='https://github.com/learningequality/kolibri',
    packages=[
        str('kolibri'),  # https://github.com/pypa/setuptools/pull/597
    ],
    entry_points={
        'console_scripts': [
            'kolibri = kolibri.utils.cli:main'
        ]
    },
    package_dir={'kolibri': 'kolibri'},
    include_package_data=True,
    install_requires=install_requires,
    dependency_links=dependency_links,
    setup_requires=['pytest-runner'],
    tests_require=['pytest', 'tox', 'flake8'],
    license='MIT',
    zip_safe=False,
    keywords='kolibri',
    classifiers=[
        'Development Status :: 2 - Pre-Alpha',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: MIT License',
        'Natural Language :: English',
        'Programming Language :: Python :: 2',
        'Programming Language :: Python :: 2.7',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.3',
        'Programming Language :: Python :: 3.4',
        'Programming Language :: Python :: 3.5',
        'Programming Language :: Python :: Implementation :: PyPy',
    ],
    cmdclass={
        'install_scripts': bat_install_scripts  # Windows bat wrapper
    }
)
