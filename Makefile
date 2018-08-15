# Specifies the targets that should ALWAYS have their recipies run
.PHONY: help clean clean-pyc clean-build clean-assets writeversion lint test test-all coverage docs release translation-crowdin-upload translation-crowdin-download

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
	@echo "test-namespaced-packages: verify that we haven't fetched anything namespaced into kolibri/dist"
	@echo "coverage: run tests, recording and printing out Python code coverage"
	@echo "docs: generate developer documentation"
	@echo ""
	@echo "Internationalization"
	@echo "--------------------"
	@echo ""
	@echo "translation-extract: extract all strings from application (both front- and back-end)"
	@echo "translation-crowdin-upload branch=<crowdin-branch>: upload strings to Crowdin"
	@echo "translation-crowdin-download branch=<crowdin-branch>: download strings from Crowdin and compile"
	@echo "translation-crowdin-install: installs the Crowdin CLI"
	@echo "translation-django-compilemessages: compiles .po files to .mo files for Django"


clean: clean-build clean-pyc clean-assets

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
	rm -f docs/py_modules/kolibri*rst
	rm -f docs/py_modules/modules.rst
	$(MAKE) -C docs clean

lint:
	flake8 kolibri

test:
	pytest

test-all:
	tox

assets:
	yarn install
	yarn run build

coverage:
	coverage run --source kolibri setup.py test
	coverage report -m

docs: clean-docs
	sphinx-apidoc -d 10 -H "Python Reference" -o docs/py_modules/ kolibri kolibri/test kolibri/deployment/ kolibri/dist/
	$(MAKE) -C docs html

release:
	@ls -l dist/
	@echo "Release process documentation:"
	@echo ""
	@echo "http://kolibri-dev.readthedocs.io/en/develop/references/release_process.html"
	@echo ""
	@echo ""
	@echo "Quick check list:"
	@echo ""
	@echo "1. Release notes?"
	@echo "2. Downloaded CrowdIn translations?"
	@echo "3. Pushed CrowdIn translations to repo?"
	@echo "4. Version info as tag and in kolibri.VERSION?"
	@echo "5. Did you do a signed commit and push to Github?"
	@echo "6. Check that the .whl and .tar.gz dists work?"
	@echo ""
	@echo "Do you want to upload everything in dist/*?"
	@echo ""
	@echo "CTRL+C to exit. ENTER to continue."
	@read __
	twine upload -s dist/*

test-namespaced-packages:
	# This expression checks that everything in kolibri/dist has an __init__.py
	# To prevent namespaced packages from suddenly showing up
	# https://github.com/learningequality/kolibri/pull/2972
	! find kolibri/dist -mindepth 1 -maxdepth 1 -type d -not -name __pycache__ -not -name cext -not -name py2only -exec ls {}/__init__.py \; 2>&1 | grep  "No such file"

staticdeps:
	test "${SKIP_PY_CHECK}" = "1" || python --version 2>&1 | grep -q 2.7 || ( echo "Only intended to run on Python 2.7" && exit 1 )
	rm -rf kolibri/dist/* || true # remove everything
	git checkout -- kolibri/dist # restore __init__.py
	pip install -t kolibri/dist -r "requirements.txt"
	rm -rf kolibri/dist/*.dist-info  # pip installs from PyPI will complain if we have more than one dist-info directory.
	rm -r kolibri/dist/man kolibri/dist/bin || true # remove the two folders introduced by pip 10
	# Remove unnecessary python2-syntax'ed file
	# https://github.com/learningequality/kolibri/issues/3152
	rm -f kolibri/dist/kolibri_exercise_perseus_plugin/static/mathjax/kathjax.py
	python build_tools/py2only.py # move `future` and `futures` packages to `kolibri/dist/py2only`
	make test-namespaced-packages

staticdeps-cext:
	rm -rf kolibri/dist/cext || true # remove everything
	python build_tools/install_cexts.py --file "requirements/cext.txt" # pip install c extensions
	pip install -t kolibri/dist/cext -r "requirements/cext_noarch.txt" --no-deps
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

dist: writeversion staticdeps staticdeps-cext buildconfig assets translation-django-compilemessages
	python setup.py sdist --format=gztar --static > /dev/null # silence the sdist output! Too noisy!
	python setup.py bdist_wheel --static
	ls -l dist

pex: writeversion
	ls dist/*.whl | while read whlfile; do pex $$whlfile --disable-cache -o dist/kolibri-`cat kolibri/VERSION | sed 's/+/_/g'`.pex -m kolibri --python-shebang=/usr/bin/python; done

translation-extract: clean-build
	@echo ""
	@echo "!! This assumes that you are running with latest assets. Run 'make assets' if in doubt !!"
	@echo ""
	python -m kolibri manage makemessages -- -l en --ignore 'node_modules/*' --ignore 'kolibri/dist/*'

translation-django-compilemessages:
	# Change working directory to kolibri/ such that compilemessages
	# finds only the .po files nested there.
	cd kolibri && PYTHONPATH="..:$$PYTHONPATH" python -m kolibri manage compilemessages

translation-crowdin-install:
	@`[ -f build_tools/crowdin-cli.jar ]` && echo "Found crowdin-cli.jar" || wget -O build_tools/crowdin-cli.jar https://storage.googleapis.com/le-downloads/crowdin-cli/crowdin-cli.jar

translation-crowdin-upload:
	java -jar build_tools/crowdin-cli.jar -c build_tools/crowdin.yaml upload sources -b ${branch}

# This rule must depend on translation-extract, such that source files have been generated
# for CrowdIn CLI's pattern matching. If they are not in place, stuff will break.
# See: https://github.com/learningequality/kolibri/pull/4121
translation-crowdin-download: translation-extract
	@echo "\nWhen doing new releases: Remember to build the project on CrowdIn\n\n"
	java -jar build_tools/crowdin-cli.jar -c build_tools/crowdin.yaml download -b ${branch}

dockerenvclean:
	docker container prune -f
	docker image prune -f

dockerenvbuild: writeversion
	docker image build -t "learningequality/kolibri:$$(cat kolibri/VERSION | sed 's/+/_/g')" -t learningequality/kolibri:latest .

dockerenvdist: writeversion
	docker run --env-file ./env.list -v $$PWD/dist:/kolibridist "learningequality/kolibri:$$(cat kolibri/VERSION | sed 's/+/_/g')"
