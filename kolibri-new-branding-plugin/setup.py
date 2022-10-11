#!/usr/bin/env python
# -*- coding: utf-8 -*-
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from setuptools import find_packages
from setuptools import setup

name = "kolibri_new_branding_plugin"


setup(
    name=name,
    version="0.1.0",
    description="New kolibri branding",
    author="Learning Equality",
    author_email="info@learningequality.org",
    url="https://github.com/learningequality/kolibri-new-branding-plugin/",
    packages=find_packages(),
    package_dir={name: name},
    include_package_data=True,
    zip_safe=False,
)
