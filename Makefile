.PHONY: help clean clean-pyc clean-build list test test-all coverage docs release sdist

help:
	@echo "clean-build - remove build artifacts"
	@echo "clean-pyc - remove Python file artifacts"
	@echo "lint - check style with flake8"
	@echo "test - run tests quickly with the default Python"
	@echo "testall - run tests on every Python version with tox"
	@echo "coverage - check code coverage quickly with the default Python"
	@echo "docs - generate Sphinx HTML documentation, including API docs"
	@echo "release - package and upload a release"
	@echo "sdist - package"

clean: clean-build clean-pyc clean-docs

clean-build:
	rm -fr build/
	rm -fr dist/
	rm -fr *.egg-info

clean-pyc:
	find . -name '*.pyc' -exec rm -f {} +
	find . -name '*.pyo' -exec rm -f {} +
	find . -name '*~' -exec rm -f {} +

clean-docs:
	rm -f docs/kolibri*rst
	rm -f docs/modules.rst
	$(MAKE) -C docs clean

lint:
	flake8 kolibri

test:
	python setup.py test

test-all:
	tox

coverage:
	coverage run --source kolibri setup.py test
	coverage report -m

docs: clean-docs
	sphinx-apidoc -d 10 -H "Python Reference" -o docs/ kolibri kolibri/test kolibri/deployment/
	$(MAKE) -C docs html

release: clean
	python setup.py sdist upload
	python setup.py bdist_wheel upload

sdist: clean
	python setup.py sdist
	python setup.py bdist_wheel
	ls -l dist
