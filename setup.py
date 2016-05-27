#!/usr/bin/env python
# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function, unicode_literals

import logging
import os
import shutil
import sys

from setuptools import setup
from setuptools.command.install_scripts import install_scripts

import kolibri
from kolibri import dist as kolibri_dist

# Notice that we dare do this during setup.py -- this enforces a special
# restraint on module initialization, namely that it shouldn't do anything
# that depends on an installed environment.
dist_name = 'kolibri'

readme = open('README.rst').read().decode("utf-8")
doclink = """
Documentation
-------------

The full documentation is at http://kolibri.rtfd.org."""
history = open('CHANGELOG.rst').read().decode("utf-8").replace('.. :changelog:', '')

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

install_requires = [
    'colorlog',
    'django>=1.9,<1.10',
    'django-mptt==0.8.0',
    'django-js-reverse==0.7.2',
    'djangorestframework==3.3.3',
    'docopt',
    'drf-nested-routers',
    'six',
]

# Check if user supplied the special '--static' option
if '--static' in sys.argv:
    sys.argv.remove('--static')
    dist_name = 'kolibri-static'
    description += " This static version, bundles all dependencies."
    install_requires, static_requirements = [], install_requires
    static_build = True


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


# If it's a static build, we invoke pip to bundle dependencies in python-packages
# This would be the case for commands "bdist" and "sdist"
if static_requirements and is_building_dist:

    sys.stderr.write(
        "This is a static build... invoking pip to put static dependencies in "
        "dist-packages/\n\n"
        "Requirements:\n\n" + "\n".join(static_requirements)
    )

    current_dir = os.path.dirname(os.path.realpath(__file__))
    static_cache_dir = os.path.join(current_dir, 'dist-packages-cache')
    static_temp_dir = os.path.join(current_dir, 'dist-packages-temp')

    # Create directory where dynamically created dependencies are put
    if not os.path.exists(static_cache_dir):
        os.mkdir(static_cache_dir)

    # Should remove the temporary directory always
    if os.path.exists(static_temp_dir):
        sys.stderr.write("Removing previous temporary sources for pip {}".format(static_temp_dir))
        shutil.rmtree(static_temp_dir)

    # Install from pip

    # Code modified from this example:
    # http://threebean.org/blog/2011/06/06/installing-from-pip-inside-python-or-a-simple-pip-api/
    import pip.commands.install

    # Ensure we get output from pip
    enable_log_to_stdout('pip.commands.install')

    def install_distributions(distributions):
        command = pip.commands.install.InstallCommand()
        opts, ___ = command.parser.parse_args([])
        opts.target_dir = static_dir
        opts.build_dir = static_temp_dir
        opts.download_cache = static_cache_dir
        opts.isolated = True
        opts.compile = False
        opts.ignore_dependencies = True
        opts.use_wheel = False
        opts.no_clean = False
        command.run(opts, distributions)
        # requirement_set.source_dir = STATIC_DIST_PACKAGES_TEMP
        # requirement_set.install(opts)

    install_distributions(static_requirements)

elif is_building_dist:

    if len(os.listdir(static_dir)) > 3:
        raise RuntimeError(
            "Please empty {} - make clean!".format(
                static_dir
            )
        )


setup(
    name=dist_name,
    version=kolibri.__version__,
    description='Kolibri',
    long_description="{readme}\n\n{doclink}\n\n{history}".format(
        readme=readme,
        doclink=doclink,
        history=history
    ),
    author='Learning Equality',
    author_email='info@learningequality.org',
    url='https://github.com/learningequality/kolibri',
    packages=[
        'kolibri',
    ],
    entry_points={
        'console_scripts': [
            'kolibri = kolibri.utils.cli:main'
        ]
    },
    package_dir={'kolibri': 'kolibri'},
    include_package_data=True,
    install_requires=install_requires,
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
