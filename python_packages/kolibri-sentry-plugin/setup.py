#!/usr/bin/env python
# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function, unicode_literals

from setuptools import setup

import kolibri_sentry_plugin

dist_name = "kolibri_sentry_plugin"
plugin_name = "kolibri_sentry_plugin"
repo_url = "https://github.com/learningequality/kolibri-sentry-plugin"

# Default description of the distributed package
description = """A plugin to provide sentry integration for Kolibri"""

long_description = """
A plugin that provides Sentry SDK integration for the frontend and backend
of Kolibri. See the `Github repo <{repo_url}>`_ for more details.
""".format(
    repo_url=repo_url
)

setup(
    name=dist_name,
    version=kolibri_sentry_plugin.__version__,
    description=description,
    long_description=long_description,
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
