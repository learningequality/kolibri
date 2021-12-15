from setuptools import find_packages, setup

version = '0.2.1'

setup(
    name='kolibri-installer-mac',
    version=version,
    description='Native app shell for the Kolibri Learning Platform.',
    author='Kevin Ollivier',
    author_email='kevin@learningequality.org',
    license='MIT',
    # test_suite = 'your.module.tests',
    entry_points={
        'console_scripts': [
            'kapew = kapew:main'
        ]
    }
)
