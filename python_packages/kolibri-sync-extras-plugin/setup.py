#!/usr/bin/env python
# -*- coding: utf-8 -*-
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from setuptools import setup

import kolibri_sync_extras_plugin


dist_name = "kolibri_sync_extras_plugin"


# Default description of the distributed package
description = """Kolibri plugin that provides extra features for peer-to-peer syncing"""

long_description = """
`Kolibri <https://learningequality.org/kolibri/>`_ is the offline learning platform
from `Learning Equality <https://learningequality.org/>`_.

Kolibri supports syncing facility data between two instances. This plugin provides additional sync
related features that can be turned on to customize the behavior of those syncs.
"""

setup(
    name=dist_name,
    version=kolibri_sync_extras_plugin.__version__,
    description=description,
    long_description=long_description,
    author="Learning Equality",
    author_email="info@learningequality.org",
    url="https://github.com/learningequality/kolibri-sync-extras-plugin",
    packages=[
        str(
            "kolibri_sync_extras_plugin"
        ),  # https://github.com/pypa/setuptools/pull/597
    ],
    entry_points={
        "kolibri.plugins": "kolibri_sync_extras_plugin = kolibri_sync_extras_plugin",
    },
    package_dir={"kolibri_sync_extras_plugin": "kolibri_sync_extras_plugin"},
    include_package_data=True,
    license="MIT",
    install_requires=[],
    extras_require={
        "dev": [
            "setuptools",
            "wheel",
            "twine",
        ]
    },
    zip_safe=False,
    keywords=["kolibri", "syncing", "morango"],
    classifiers=[
        "Development Status :: 4 - Beta",
        "Framework :: Django",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Natural Language :: English",
        "Programming Language :: Python :: 2",
        "Programming Language :: Python :: 2.7",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.4",
        "Programming Language :: Python :: 3.5",
        "Programming Language :: Python :: 3.6",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
    ],
)
