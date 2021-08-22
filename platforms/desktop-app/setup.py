from setuptools import find_packages, setup

version = '0.1.2'

setup(
    name='kolibri-app',
    version=version,
    description='wxPython app for the Kolibri Learning Platform.',
    author='Learning Equality',
    author_email='dev@learningequality.org',
    packages=[str("kolibri_app")],  # https://github.com/pypa/setuptools/pull/597
    package_dir={"kolibri_app": 'src/kolibri_app'},
    license='MIT',
    install_requires=['wxPython==4.1.1'],
    # test_suite = 'your.module.tests',
    entry_points={
        'console_scripts': [
            'kapew = kapew:main'
        ]
    }
    **extra_options
)
