# List most target names as 'PHONY' to prevent Make from thinking it will be creating a file of the same name
.PHONY: help clean clean-assets clean-build clean-pyc clean-docs lint test test-all assets coverage docs release test-namespaced-packages staticdeps staticdeps-cext writeversion setrequirements buildconfig pex i18n-extract-frontend i18n-extract-backend i18n-transfer-context i18n-extract i18n-django-compilemessages i18n-upload i18n-pretranslate i18n-pretranslate-approve-all i18n-download i18n-regenerate-fonts i18n-stats i18n-install-font i18n-download-glossary i18n-upload-glossary docker-clean docker-whl docker-deb docker-deb-test docker-windows docker-demoserver docker-devserver docker-envlist

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
	@echo "setrequirements: creates a customized requirements.txt"
	@echo "buildconfig: customizes the default plugins and Django settings module"
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
	@echo "i18n-extract: extract all strings from application (both front- and back-end)"
	@echo "i18n-upload branch=<crowdin-branch>: upload sources to Crowdin"
	@echo "i18n-pretranslate branch=<crowdin-branch>: pretranslate on Crowdin"
	@echo "i18n-pretranslate-approve branch=<crowdin-branch>: pretranslate and pre-approve on Crowdin"
	@echo "i18n-download branch=<crowdin-branch>: download strings from Crowdin"
	@echo "i18n-download-source-fonts: retrieve source Google Noto fonts"
	@echo "i18n-regenerate-fonts: regenerate font files"
	@echo "i18n-update branch=<crowdin-branch>: i18n-download + i18n-regenerate-fonts"
	@echo "i18n-stats branch=<crowdin-branch>: output information about translation status"
	@echo "i18n-django-compilemessages: compiles .po files to .mo files for Django"
	@echo "i18n-install-font name=<noto-font>: Downloads and installs a new or updated font"
	@echo "i18n-download-glossary: Download the glossary file from crowdin and update locally
	@echo "i18n-upload-glossary: Upload the local file to crowdin


clean: clean-build clean-pyc clean-assets clean-staticdeps

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
	rm -f SQLITE_MAX_VARIABLE_NUMBER.cache
	rm -fr kolibri/dist/* || true # remove everything
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

clean-staticdeps:
	rm -rf kolibri/dist/* || true # remove everything
	git checkout -- kolibri/dist # restore __init__.py

staticdeps: clean-staticdeps
	test "${SKIP_PY_CHECK}" = "1" || python --version 2>&1 | grep -q 2.7 || ( echo "Only intended to run on Python 2.7" && exit 1 )
	pip2 install -t kolibri/dist -r "requirements.txt"
	rm -rf kolibri/dist/*.dist-info  # pip installs from PyPI will complain if we have more than one dist-info directory.
	rm -rf kolibri/dist/*.egg-info
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
	rm -rf kolibri/dist/*.egg-info
	make test-namespaced-packages

staticdeps-compileall:
	bash -c 'python --version'
	# Seems like the compileall module does not return a non-zero exit code when failing
	bash -c 'if ( python -m compileall -x py2only kolibri -q | grep SyntaxError ) ; then echo "Failed to compile kolibri/dist/" ; exit 1 ; else exit 0 ; fi'

writeversion:
	python -c "import kolibri; print(kolibri.__version__)" > kolibri/VERSION
	@echo ""
	@echo "Current version is now `cat kolibri/VERSION`"

setrequirements:
	rm -r requirements.txt || true # remove requirements.txt
	git checkout -- requirements.txt # restore requirements.txt
	python build_tools/customize_requirements.py

buildconfig:
	rm -r kolibri/utils/build_config/* || true # remove everything
	git checkout -- kolibri/utils/build_config # restore __init__.py
	python build_tools/customize_build.py

dist: setrequirements writeversion staticdeps staticdeps-cext buildconfig i18n-extract-frontend assets i18n-django-compilemessages
	python setup.py sdist --format=gztar > /dev/null # silence the sdist output! Too noisy!
	python setup.py bdist_wheel
	ls -l dist

pex: writeversion
	ls dist/*.whl | while read whlfile; do pex $$whlfile --disable-cache -o dist/kolibri-`cat kolibri/VERSION | sed 's/+/_/g'`.pex -m kolibri --python-shebang=/usr/bin/python; done

i18n-extract-backend:
	python -m kolibri manage makemessages -- -l en --ignore 'node_modules/*' --ignore 'kolibri/dist/*'

i18n-extract-frontend:
	yarn run makemessages

i18n-extract: i18n-extract-frontend i18n-extract-backend

i18n-transfer-context:
	yarn transfercontext

i18n-django-compilemessages:
	# Change working directory to kolibri/ such that compilemessages
	# finds only the .po files nested there.
	cd kolibri && PYTHONPATH="..:$$PYTHONPATH" python -m kolibri manage compilemessages

i18n-upload: i18n-extract
	python build_tools/i18n/crowdin.py upload-sources ${branch}

i18n-pretranslate:
	python build_tools/i18n/crowdin.py pretranslate ${branch}

i18n-pretranslate-approve-all:
	python build_tools/i18n/crowdin.py pretranslate ${branch} --approve-all

i18n-convert:
	python build_tools/i18n/crowdin.py convert-files

i18n-download:
	python build_tools/i18n/crowdin.py rebuild-translations ${branch}
	python build_tools/i18n/crowdin.py download-translations ${branch}
	node build_tools/i18n/intl_code_gen.js
	$(MAKE) i18n-django-compilemessages
	python build_tools/i18n/crowdin.py convert-files

i18n-download-source-fonts:
	python build_tools/i18n/fonts.py download-source-fonts

i18n-regenerate-fonts:
	python build_tools/i18n/fonts.py generate-full-fonts
	python build_tools/i18n/fonts.py generate-subset-fonts

i18n-update: i18n-download i18n-regenerate-fonts i18n-transfer-context

i18n-stats:
	python build_tools/i18n/crowdin.py translation-stats ${branch}

i18n-install-font:
	python build_tools/i18n/fonts.py add-source-font ${name}

i18n-download-glossary:
	python build_tools/i18n/crowdin.py download-glossary

i18n-upload-glossary:
	python build_tools/i18n/crowdin.py upload-glossary

docker-clean:
	docker container prune --filter "label!=build=pigen" -f
	docker image prune --filter "label!=build=pigen" -a -f

docker-whl: writeversion docker-envlist
	docker image build -t "learningequality/kolibri-whl" -f docker/build_whl.dockerfile .
	docker run \
		--env-file ./docker/env.list \
		-v $$PWD/dist:/kolibridist \
		-v yarn_cache:/yarn_cache \
		"learningequality/kolibri-whl"
	git checkout -- ./docker/env.list  # restore env.list file

docker-deb: writeversion docker-envlist
	@echo "\n  !! This assumes you have run 'make dockerenvdist' or 'make dist' !!\n"
	docker image build -t "learningequality/kolibri-deb" -f docker/build_debian.dockerfile .
	export KOLIBRI_VERSION=$$(cat kolibri/VERSION) && \
	docker run --env-file ./docker/env.list -v $$PWD/dist:/kolibridist "learningequality/kolibri-deb"
	git checkout -- ./docker/env.list  # restore env.list file

docker-deb-test: docker-envlist
	@echo "\n  !! This assumes that there are *.deb files in dist/ for testing !!\n"
	# docker image build -t "learningequality/kolibri-deb-test-trusty" -f docker/test_trusty.dockerfile .
	# docker run --env-file ./docker/env.list -v $$PWD/dist:/kolibridist "learningequality/kolibri-deb-test-trusty"
	docker image build -t "learningequality/kolibri-deb-test-xenial" -f docker/test_xenial.dockerfile .
	docker run --env-file ./docker/env.list -v $$PWD/dist:/kolibridist "learningequality/kolibri-deb-test-xenial"
	docker image build -t "learningequality/kolibri-deb-test-bionic" -f docker/test_bionic.dockerfile .
	docker run --env-file ./docker/env.list -v $$PWD/dist:/kolibridist "learningequality/kolibri-deb-test-bionic"
	git checkout -- ./docker/env.list  # restore env.list file

docker-windows: writeversion docker-envlist
	@echo "\n  !! This assumes you have run 'make dockerenvdist' or 'make dist' !!\n"
	docker image build -t "learningequality/kolibri-windows" -f docker/build_windows.dockerfile .
	export KOLIBRI_VERSION=$$(cat kolibri/VERSION) && \
	docker run --env-file ./docker/env.list -v $$PWD/dist:/kolibridist "learningequality/kolibri-windows"
	git checkout -- ./docker/env.list  # restore env.list file

docker-build-base: writeversion
	docker image build . \
		-f docker/base.dockerfile \
		-t "learningequality/kolibribase"

docker-demoserver: docker-envlist
	# Build the demoserver image
	docker image build \
			-f docker/demoserver.dockerfile \
			-t "learningequality/demoserver" .
	docker run --init \
			-v $$PWD/docker/mnt:/docker/mnt \
			-p 8080:8080 \
			--env-file ./docker/env.list \
			--env KOLIBRI_PEX_URL="default" \
			--env KOLIBRI_CHANNELS_TO_IMPORT="7765d6aeabc35de790f8bc4532aeb529" \
			"learningequality/demoserver"
	echo "Check http://localhost:8080 you should have a demoserver running there."
	git checkout -- ./docker/env.list  # restore env.list file


docker-devserver: docker-envlist
	# Build the kolibridev image: contains source code + pip install -e of kolibri
	docker image build \
			-f docker/dev.dockerfile \
			-t "learningequality/kolibridev" .
	docker run --init \
			-v $$PWD/docker/mnt:/docker/mnt \
			-p 8000:8000 \
			-p 3000:3000 \
			--env-file ./docker/env.list \
			"learningequality/kolibridev" \
			yarn run devserver
	echo "Check http://localhost:8000  you should have devserver running there."
	git checkout -- ./docker/env.list  # restore env.list file

# Optionally add --env KOLIBRI_PROVISIONDEVICE_FACILITY="Dev Server" to skip setup wizard

# TODO: figure out how to add source code as "volume" so can live-edit,
# 		  e.g. -v $$PWD/kolibri:/kolibri/kolibri ??

docker-envlist:
	python build_tools/customize_docker_envlist.py
