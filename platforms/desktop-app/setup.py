import codecs
import os.path

from setuptools import setup


def read(rel_path):
    here = os.path.abspath(os.path.dirname(__file__))
    with codecs.open(os.path.join(here, rel_path), "r") as fp:
        return fp.read()


def get_version(rel_path):
    for line in read(rel_path).splitlines():
        if line.startswith("__version__"):
            delim = '"' if '"' in line else "'"
            return line.split(delim)[1]
    else:
        raise RuntimeError("Unable to find version string.")


setup(
    name="kolibri-app",
    version=get_version("src/kolibri_app/__init__.py"),
    description="wxPython app for the Kolibri Learning Platform.",
    author="Learning Equality",
    author_email="dev@learningequality.org",
    packages=[str("kolibri_app")],  # https://github.com/pypa/setuptools/pull/597
    package_dir={"": "src"},
    include_package_data=True,
    zip_safe=True,
    license="MIT",
    install_requires=["wxPython==4.2.0", "cryptography==42.0.2", "cffi==1.14.4"],
    extras_require={"dev": ["pre-commit"]},
)
