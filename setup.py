#!/usr/bin/env python

from setuptools import setup

# Notice that we dare do this during setup.py -- this enforces a special
# restraint on module initialization, namely that it shouldn't do anything
# that depends on an installed environment.
import kolibri

readme = open('README.rst').read()
doclink = """
Documentation
-------------

The full documentation is at http://kolibri.rtfd.org."""
history = open('CHANGELOG.rst').read().replace('.. :changelog:', '')

setup(
    name='kolibri',
    version=kolibri.__version__,
    description='Kolibri',
    long_description=readme + '\n\n' + doclink + '\n\n' + history,
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
    install_requires=[
        'colorlog',
        'django>=1.9,<1.10',
        'django-mptt==0.8.0',
        'django-js-reverse==0.7.2',
        'djangorestframework==3.3.3',
        'docopt',
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
