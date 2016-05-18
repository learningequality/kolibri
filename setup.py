#!/usr/bin/env python

from setuptools import setup

readme = open('README.rst').read()
doclink = """
Documentation
-------------

The full documentation is at http://kolibri.rtfd.org."""
history = open('CHANGELOG.rst').read().replace('.. :changelog:', '')

setup(
    name='kolibri',
    version='0.0.1',
    description='Kolibri',
    long_description=readme + '\n\n' + doclink + '\n\n' + history,
    author='Learning Equality',
    author_email='info@learningequality.org',
    url='https://github.com/benjaoming/kolibri_skeleton',
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
    install_requires=[
        'django>=1.9,<1.10',
        'docopt',
        'colorlog',
        'django-mptt==0.8.0',
        'djangorestframework==3.3.3',
        'drf-nested-routers',
        'six',
    ],
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
)
