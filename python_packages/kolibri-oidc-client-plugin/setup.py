#!/usr/bin/env python
# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function, unicode_literals
import logging
from setuptools import setup
import kolibri_oidc_client_plugin


dist_name = 'kolibri_oidc_client_plugin'


# Default description of the distributed package
description = (
    """Kolibri plugin to authenticate using an OpenID Connect provider"""
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

OpenID Connect (OIDC) is a simple identity layer on top of the OAuth 2.0 protocol. It allows Clients to verify the identity of the End-User based on the authentication performed by an Authorization Server, as well as to obtain basic profile information about the End-User in an interoperable and REST-like manner.).

This package provides Kolibri users with the ability to authenticate against an OpenID provider. This is usually a need when integrating it with another applications sharing a Single Sign On (SSO) authentication.
"""

setup(
    name=dist_name,
    version=kolibri_oidc_client_plugin.__version__,
    description=description,
    long_description=long_description,
    author='Learning Equality',
    author_email='info@learningequality.org',
    url='https://github.com/learningequality/kolibri-oidc-client-plugin',
    packages=[
        str('kolibri_oidc_client_plugin'),  # https://github.com/pypa/setuptools/pull/597
    ],
    package_dir={'kolibri_oidc_client_plugin': 'kolibri_oidc_client_plugin'},
    include_package_data=True,
    license='MIT',
    install_requires=['mozilla-django-oidc'],
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
        'Topic :: System :: Systems Administration :: Authentication/Directory'
    ],
)
