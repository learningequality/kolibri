#!/usr/bin/env python
# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function, unicode_literals

import sys

from setuptools import setup

import kolibri_sentry_plugin


def read_file(fname):
    """
    Read file and decode in py2k
    """
    if sys.version_info < (3,):
        return open(fname).read().decode("utf-8")
    return open(fname).read()


dist_name = "kolibri_sentry_plugin"
plugin_name = "kolibri_sentry_plugin"
repo_url = "https://github.com/learningequality/kolibri-sentry-plugin"

readme = read_file("README.rst")
doclink = """
Documentation
-------------

The full documentation is at."""

# Default description of the distributed package
description = """A plugin to provide sentry integration for Kolibri"""


setup(
    name=dist_name,
    version=kolibri_sentry_plugin.__version__,
    description=description,
    long_description="{readme}\n\n{doclink}".format(readme=readme, doclink=doclink),
    author="Learning Equality",
    author_email="info@learningequality.org",
    url=repo_url,
    packages=[str(plugin_name)],  # https://github.com/pypa/setuptools/pull/597
    package_dir={plugin_name: plugin_name},
    install_requires=["sentry-sdk==0.7.9"],
    include_package_data=True,
    license="MIT",
    zip_safe=False,
    keywords="kolibri",
    classifiers=[
        "Development Status :: 2 - Pre-Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Natural Language :: English",
        "Programming Language :: Python :: 2",
        "Programming Language :: Python :: 2.7",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.3",
        "Programming Language :: Python :: 3.4",
        "Programming Language :: Python :: 3.5",
        "Programming Language :: Python :: Implementation :: PyPy",
    ],
)
