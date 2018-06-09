#!/usr/bin/env python
# -*- coding: utf-8 -*-
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import io
import logging
import os
import sys

try:  # for pip >= 10
    from pip._internal.req import parse_requirements
except ImportError:  # for pip <= 9.0.3
    from pip.req import parse_requirements
from setuptools import setup
from setuptools.command.install_scripts import install_scripts

import kolibri
from kolibri import dist as kolibri_dist


dist_name = 'kolibri'

readme = io.open('README.rst', mode='r', encoding='utf-8').read()

# Default description of the distributed package
description = ("""Kolibri - the offline app for universal education""")

# Decide if the invoked command is a request to do building
is_building_dist = any([
    x in sys.argv
    for x in ("bdist", "sdist", "bdist_wheel", "bdist_deb", "sdist_dsc")
])

static_dir = os.path.dirname(os.path.realpath(kolibri_dist.__file__))

dependency_links, install_requires, static_requirements = [], [], []

# Check if user supplied the special '--static' option
# !! Currently, we just bundle no matter what
if is_building_dist or '--static' in sys.argv:
    sys.argv.remove('--static')
    static_build = True

# TODO:
# `pip -e .` should work in a source dir, however since it doesn't
# anyways (because of http sources in requirements.txt), we can
# just skip this part
# Either the installation is a .whl or sdist or it's done from source
# dir and this requires `pip install -r requirements.txt`
# anyways!
# We don't currently have a release that has dependencies, everything
# is bundled.
elif False:
    req_file = os.path.join(
        os.path.dirname(os.path.realpath(__file__)), "requirements.txt"
    )
    reqs = parse_requirements(req_file, session=False)
    install_requires = [str(ir.req) for ir in reqs]
    static_requirements = []
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
            if not (
                first_line.startswith('#!') and 'python' in first_line.lower()
            ):
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
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    # add formatter to ch
    ch.setFormatter(formatter)
    # add ch to logger
    log.addHandler(ch)


setup(
    name=dist_name,
    version=kolibri.__version__,
    description=description,
    long_description=readme,
    author='Learning Equality',
    author_email='info@learningequality.org',
    url='https://github.com/learningequality/kolibri',
    packages=[
        str('kolibri'),  # https://github.com/pypa/setuptools/pull/597
    ],
    entry_points={'console_scripts': ['kolibri = kolibri.utils.cli:main']},
    package_dir={'kolibri': 'kolibri'},
    include_package_data=True,
    install_requires=install_requires,
    dependency_links=dependency_links,
    tests_require=['pytest', 'tox', 'flake8'],
    license='MIT',
    zip_safe=False,
    keywords=['education', 'offline', 'kolibri'],
    classifiers=[
        'Intended Audience :: Developers',
        'License :: OSI Approved :: MIT License',
        'Natural Language :: English',
        'Development Status :: 4 - Beta',
        'Programming Language :: Python :: 2',
        'Programming Language :: Python :: 2.7',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.3',
        'Programming Language :: Python :: 3.4',
        'Programming Language :: Python :: 3.5',
        'Programming Language :: Python :: 3.6',
        'Programming Language :: Python :: Implementation :: PyPy',
    ],
    cmdclass={
        'install_scripts': bat_install_scripts  # Windows bat wrapper
    }
)
