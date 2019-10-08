#!/usr/bin/env python
# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function, unicode_literals
import logging
from setuptools import setup
import kolibri_opensearch_plugin


dist_name = 'kolibri_opensearch_plugin'


# Default description of the distributed package
description = (
    """Kolibri plugin to provide an OpenSearch compatible API"""
)


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


long_description = """
`Kolibri <https://learningequality.org/kolibri/>`_ is the offline learning platform
from `Learning Equality <https://learningequality.org/>`_.

OpenSearch is a collection of simple formats for the sharing of search results.

The OpenSearch description document format can be used to describe a search engine so that it can be used by search client applications.

The OpenSearch response elements can be used to extend existing syndication formats, such as RSS and Atom, with the extra metadata needed to return search results.

This package provides Kolibri users with OpenSearch compatible endpoints to be used by third party applications.
"""

setup(
    name=dist_name,
    version=kolibri_opensearch_plugin.__version__,
    description=description,
    long_description=long_description,
    author='Learning Equality',
    author_email='info@learningequality.org',
    url='https://github.com/learningequality/kolibri-opensearch-plugin',
    packages=[
        str('kolibri_opensearch_plugin'),  # https://github.com/pypa/setuptools/pull/597
    ],
    package_dir={'kolibri_opensearch_plugin': 'kolibri_opensearch_plugin'},
    include_package_data=True,
    license='MIT',
    install_requires=[],
    extras_require={
        'dev': [
            'setuptools',
            'wheel',
            'twine',
        ]
    },
    zip_safe=False,
    keywords='kolibri',
    classifiers=[
        'Development Status :: 4 - Beta',
        'Framework :: Django',
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
        'Topic :: Education :: Computer Aided Instruction (CAI)',
        'Topic :: Internet :: WWW/HTTP :: Indexing/Search'
    ],
)
