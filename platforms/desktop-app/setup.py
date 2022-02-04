from setuptools import setup

setup(
    name="kolibri-app",
    description="wxPython app for the Kolibri Learning Platform.",
    author="Learning Equality",
    author_email="dev@learningequality.org",
    packages=[str("kolibri_app")],  # https://github.com/pypa/setuptools/pull/597
    package_dir={"": "src"},
    include_package_data=True,
    zip_safe=True,
    license="MIT",
    install_requires=["wxPython==4.1.1"],
    extras_require={"dev": ["pre-commit"]},
)
