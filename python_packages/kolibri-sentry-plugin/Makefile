.PHONY: help clean clean-pyc release dist assets install-js-deps

help:
	@echo "clean-build - remove build artifacts"
	@echo "clean-pyc - remove Python file artifacts"
	@echo "release - package and upload a release"
	@echo "dist - package"

clean: clean-assets clean-build clean-pyc

clean-assets:
	yarn run clean

clean-build:
	rm -fr build/
	rm -fr dist/
	rm -fr dist-packages-cache/
	rm -fr dist-packages-temp/
	rm -fr *.egg-info
	rm -fr .eggs
	rm -fr .cache

clean-pyc:
	find . -name '*.pyc' -exec rm -f {} +
	find . -name '*.pyo' -exec rm -f {} +
	find . -name '*~' -exec rm -f {} +

install-js-deps:
	yarn --frozen-lockfile

assets: install-js-deps
	yarn run build

dist: clean assets
	pip install setuptools wheel
	python setup.py sdist
	python setup.py bdist_wheel --universal

release: dist
	echo "Ensure that you have built the frontend files using Kolibri"
	echo "Uploading dist/* to PyPi, using twine"
	twine upload -s dist/*
