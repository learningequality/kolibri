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

clean: clean-build clean-pyc clean-docs clean-static

clean-static:
	yarn run clean

clean-build:
	rm -fr build/
	rm -fr dist/
	rm -fr dist-packages-cache/
	rm -fr dist-packages-temp/
	rm -fr *.egg-info
	rm -fr .eggs
	rm -fr .cache
	rm -r kolibri/dist/exercise_perseus_renderer || true
	git clean -X -d -f kolibri/dist

clean-pyc:
	find . -name '*.pyc' -exec rm -f {} +
	find . -name '*.pyo' -exec rm -f {} +
	find . -name '*~' -exec rm -f {} +

clean-docs:
	rm -f docs/py_modules/kolibri*rst
	rm -f docs/py_modules/modules.rst
	rm -f docs/kolibri*rst # old location
	rm -f docs/modules.rst # old location
	$(MAKE) -C docs clean

lint:
	flake8 kolibri

test:
	python setup.py test

test-all:
	tox

assets: staticdeps
	yarn run build

coverage:
	coverage run --source kolibri setup.py test
	coverage report -m

docs: clean-docs
	sphinx-apidoc -d 10 -H "Python Reference" -o docs/py_modules/ kolibri kolibri/test kolibri/deployment/ kolibri/dist/
	$(MAKE) -C docs html

release: clean assets
	python setup.py sdist upload
	python setup.py bdist_wheel upload

staticdeps: clean
	pip install -t kolibri/dist -r requirements.txt
	rm -r kolibri/dist/*.dist-info  # pip installs from PyPI will complain if we have more than one dist-info directory.

writeversion:
	git describe --tags > kolibri/VERSION

dist: writeversion staticdeps assets compilemessages
	pip install -r requirements/build.txt
	python setup.py sdist --format=gztar,zip --static > /dev/null # silence the sdist output! Too noisy!
	python setup.py bdist_wheel --static
	ls -l dist

pex:
	pex . --disable-cache -o dist/`python setup.py --fullname`.pex -m kolibri --python-shebang=/usr/bin/python

makedocsmessages:
	make -C docs/ gettext
	cd docs && sphinx-intl update -p _build/locale -l en

makemessages: assets makedocsmessages
	python -m kolibri manage makemessages -- -l en --ignore 'node_modules/*' --ignore 'kolibri/dist/*' --ignore 'docs/conf.py'

compilemessages:
	python -m kolibri manage compilemessages -- -l en > /dev/null

syncmessages: ensurecrowdinclient uploadmessages downloadmessages distributefrontendmessages

ensurecrowdinclient:
	ls -l crowdin-cli.jar || wget https://crowdin.com/downloads/crowdin-cli.jar # make sure we have the official crowdin cli client

uploadmessages:
	java -jar crowdin-cli.jar upload sources -b `git symbolic-ref HEAD | xargs basename`

downloadmessages:
	java -jar crowdin-cli.jar download -b `git symbolic-ref HEAD | xargs basename`

distributefrontendmessages:
	python ./utils/distribute_frontend_messages.py

dockerenvclean:
	docker container prune -f
	docker image prune -f

dockerenvbuild: writeversion
	docker image build -t learningequality/kolibri:$$(cat kolibri/VERSION) -t learningequality/kolibri:latest .

dockerenvdist: writeversion
	docker run -v $$PWD/dist:/kolibridist learningequality/kolibri:$$(cat kolibri/VERSION)
