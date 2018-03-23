.PHONY: help clean clean-pyc clean-build list test test-all coverage docs release sdist

help:
	@echo "Usage:"
	@echo ""
	@echo "make <command>"
	@echo ""
	@echo "Building"
	@echo "--------"
	@echo ""
	@echo "dist: create distributed source packages in dist/"
	@echo "pex: builds a portable .pex file for each .whl in dist/"
	@echo "assets: builds javascript assets"
	@echo "staticdeps: downloads/updates all static Python dependencies bundled into the dist"
	@echo "staticdeps-cext: downloads/updates Python C extensions for all supported platforms"
	@echo "clean: restores code tree to a clean state"
	@echo "clean-build: remove build artifacts"
	@echo "clean-pyc: remove Python file artifacts"
	@echo "clean-assets: removes JavaScript build assets"
	@echo "writeversion: updates the kolibri/VERSION file"
	@echo "release: package and upload a release"
	@echo "buildconfig: [unsupported] runs a special script for building a source package with special requirements.txt"
	@echo ""
	@echo "Development"
	@echo "-----------"
	@echo ""
	@echo "lint: check Python style with flake8"
	@echo "test: run tests quickly with the default Python"
	@echo "test-all: run tests on every Python version with Tox"
	@echo "coverage: run tests, recording and printing out Python code coverage"
	@echo "docs: generate all documentation"
	@echo "docs-user: generate just the user docs"
	@echo "docs-developer: generate just developer and API docs"
	@echo ""
	@echo "Internationalization"
	@echo "--------------------"
	@echo ""
	@echo "makemessages: collects messages marked for translation in code+docs"
	@echo "compilemessages: compiles message sources (run this to see changes locally)"
	@echo "syncmessages: uploads and downloads contents from CrowdIn"
	@echo "uploadmessages: uploads output of makemessages to CrowdIn"
	@echo "downloadmessages: fetches new translations from CrowdIn"

clean: clean-build clean-pyc clean-docs clean-assets

clean-assets:
	yarn run clean

clean-build:
	rm -f kolibri/VERSION
	rm -fr build/
	rm -fr dist/
	rm -fr dist-packages-cache/
	rm -fr dist-packages-temp/
	rm -fr *.egg-info
	rm -fr .eggs
	rm -fr .cache
	rm -r kolibri/dist/* || true # remove everything
	git checkout -- kolibri/dist # restore __init__.py
	rm -r kolibri/utils/build_config/* || true # remove everything
	git checkout -- kolibri/utils/build_config # restore __init__.py
	rm -r requirements.txt || true # remove requirements.txt
	git checkout -- requirements.txt # restore requirements.txt

clean-pyc:
	find . -name '*.pyc' -exec rm -f {} +
	find . -name '*.pyo' -exec rm -f {} +
	find . -name '*~' -exec rm -f {} +

clean-docs:
	rm -f docs-developer/py_modules/kolibri*rst
	rm -f docs-developer/py_modules/modules.rst
	$(MAKE) -C docs clean
	$(MAKE) -C docs-developer clean

lint:
	flake8 kolibri

test:
	pytest

test-all:
	tox

assets:
	pip install -e .
	yarn install
	yarn run build

coverage:
	coverage run --source kolibri setup.py test
	coverage report -m

docs-developer: clean-docs
	sphinx-apidoc -d 10 -H "Python Reference" -o docs-developer/py_modules/ kolibri kolibri/test kolibri/deployment/ kolibri/dist/
	$(MAKE) -C docs-developer html

docs-user: clean-docs
	$(MAKE) -C docs html

docs: docs-user docs-developer

release:
	@ls -l dist/
	@echo "\nDo you want to upload everything in dist/*?\n\n CTRL+C to exit."
	@read __
	twine upload -s dist/*

test-namespaced-packages:
	# This expression checks that everything in kolibri/dist has an __init__.py
	# To prevent namespaced packages from suddenly showing up
	# https://github.com/learningequality/kolibri/pull/2972
	! find kolibri/dist -mindepth 1 -maxdepth 1 -type d -not -name __pycache__ -not -name cext -not -name py2only -exec ls {}/__init__.py \; 2>&1 | grep  "No such file"

staticdeps:
	rm -rf kolibri/dist/* || true # remove everything
	git checkout -- kolibri/dist # restore __init__.py
	pip install -t kolibri/dist -r "requirements.txt"
	rm -rf kolibri/dist/*.dist-info  # pip installs from PyPI will complain if we have more than one dist-info directory.
	python build_tools/py2only.py # move `future` and `futures` packages to `kolibri/dist/py2only`
	make test-namespaced-packages

staticdeps-cext:
	rm -rf kolibri/dist/cext || true # remove everything
	python build_tools/install_cexts.py --file "requirements/cext.txt" # pip install c extensions
	pip install -t kolibri/dist -r "requirements/cext_noarch.txt" --no-deps
	rm -rf kolibri/dist/*.dist-info  # pip installs from PyPI will complain if we have more than one dist-info directory.
	rm -rf kolibri/dist/cext/*.dist-info  # pip installs from PyPI will complain if we have more than one dist-info directory.
	make test-namespaced-packages

writeversion:
	python -c "import kolibri; print(kolibri.__version__)" > kolibri/VERSION
	@echo ""
	@echo "Current version is now `cat kolibri/VERSION`"

buildconfig:
	rm -r requirements.txt || true # remove requirements.txt
	git checkout -- requirements.txt # restore requirements.txt
	python build_tools/customize_requirements.py
	rm -r kolibri/utils/build_config/* || true # remove everything
	git checkout -- kolibri/utils/build_config # restore __init__.py
	python build_tools/customize_build.py

dist: writeversion staticdeps staticdeps-cext buildconfig assets compilemessages
	python setup.py sdist --format=gztar --static > /dev/null # silence the sdist output! Too noisy!
	python setup.py bdist_wheel --static
	ls -l dist

pex: writeversion
	ls dist/*.whl | while read whlfile; do pex $$whlfile --disable-cache -o dist/kolibri-`cat kolibri/VERSION | sed -s 's/+/_/g'`.pex -m kolibri --python-shebang=/usr/bin/python; done

makedocsmessages:
	make -C docs/ gettext
	cd docs && sphinx-intl update -p _build/locale -l en

makemessages: assets makedocsmessages
	python -m kolibri manage makemessages -- -l en --ignore 'node_modules/*' --ignore 'kolibri/dist/*' --ignore 'docs/conf.py'

compilemessages:
	python -m kolibri manage compilemessages

syncmessages: ensurecrowdinclient uploadmessages downloadmessages

ensurecrowdinclient:
	@`[ -f crowdin-cli.jar ]` && echo "Found crowdin-cli.jar" || wget https://storage.googleapis.com/le-downloads/crowdin-cli/crowdin-cli.jar

uploadmessages:
	java -jar crowdin-cli.jar upload sources -b `git symbolic-ref HEAD | xargs basename`

downloadmessages:
	java -jar crowdin-cli.jar download -b `git symbolic-ref HEAD | xargs basename`

dockerenvclean:
	docker container prune -f
	docker image prune -f

dockerenvbuild: writeversion
	docker image build -t "learningequality/kolibri:$$(cat kolibri/VERSION | sed -s 's/+/_/g')" -t learningequality/kolibri:latest .

dockerenvdist: writeversion
	docker run --env-file ./env.list -v $$PWD/dist:/kolibridist "learningequality/kolibri:$$(cat kolibri/VERSION | sed -s 's/+/_/g')"

