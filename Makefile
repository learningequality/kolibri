SHELL := /bin/bash

# List most target names as 'PHONY' to prevent Make from thinking it will be creating a file of the same name
.PHONY: help clean clean-assets clean-build clean-pyc clean-docs lint test test-all assets coverage docs release staticdeps staticdeps-cext strip-staticdeps writeversion setrequirements buildconfig pex i18n-extract-frontend i18n-extract-backend i18n-transfer-context i18n-extract i18n-django-compilemessages i18n-upload i18n-pretranslate i18n-pretranslate-approve-all i18n-download i18n-regenerate-fonts i18n-stats i18n-install-font i18n-download-translations i18n-download-glossary i18n-upload-glossary docker-whl docker-demoserver docker-devserver docker-envlist


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
	@echo "strip-staticdeps: strips debug symbols from C extensions"
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
	@echo "test-with-postgres: run tests quickly with a temporary postgresql backend"
	@echo "coverage: run tests, recording and printing out Python code coverage"
	@echo "docs: generate developer documentation"
	@echo "start-foreground-with-postgres: run Kolibri in foreground mode with a temporary postgresql backend"
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

clean-test-pypi:
	pip install pypi-cleanup==0.1.8
	pypi-cleanup --host https://test.pypi.org --package kolibri --leave-most-recent-only --yes --do-it --username aronleqtest

lint:
	flake8 kolibri

test:
	python -O -m pytest

test-all:
	tox

%-with-postgres:
	@echo -e "\e[33mWARNING: for testing purposes only; postgresql database backend is ephemeral\e[0m"
	@echo -e "\e[36mINFO: run 'docker-compose -v' to remove the database volume\e[0m"
	export KOLIBRI_DATABASE_ENGINE=postgres; \
	export KOLIBRI_DATABASE_NAME=default; \
	export KOLIBRI_DATABASE_USER=postgres; \
	export KOLIBRI_DATABASE_PASSWORD=postgres; \
	export KOLIBRI_DATABASE_HOST=127.0.0.1; \
	export KOLIBRI_DATABASE_PORT=15432; \
	set -ex; \
	function _on_interrupt() { docker-compose down; }; \
	trap _on_interrupt SIGINT SIGTERM SIGKILL ERR; \
	docker-compose up --detach; \
	until docker-compose logs --tail=1 postgres | grep -q "database system is ready to accept connections"; do \
		echo "$(date) - waiting for postgres..."; \
		sleep 1; \
	done; \
	$(MAKE) -e $(subst -with-postgres,,$@); \
	docker-compose down -v

start-foreground:
	kolibri start --foreground

assets:
	yarn install
	yarn run build
	yarn run compress

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

clean-staticdeps:
	rm -rf kolibri/dist/* || true # remove everything
	git checkout -- kolibri/dist # restore __init__.py

staticdeps: clean-staticdeps
	test "${SKIP_PY_CHECK}" = "1" || python --version 2>&1 | grep -q 3.6 || ( echo "Only intended to run on Python 3.6" && exit 1 )
	pip install -t kolibri/dist -r "requirements.txt"
	rm -rf kolibri/dist/*.egg-info
	rm -r kolibri/dist/man kolibri/dist/bin || true # remove the two folders introduced by pip 10

staticdeps-cext:
	rm -rf kolibri/dist/cext || true # remove everything
	python build_tools/install_cexts.py --file "requirements/cext.txt" # pip install c extensions
	pip install -t kolibri/dist/cext -r "requirements/cext_noarch.txt" --no-deps
	rm -rf kolibri/dist/*.egg-info

strip-staticdeps:
	find kolibri/dist -name "*.so" -exec strip --strip-unneeded {} \;
	find kolibri/dist -name "*.so" -exec aarch64-linux-gnu-strip --strip-unneeded {} \;
	find kolibri/dist -name "*.so" -exec arm-linux-gnueabihf-strip --strip-unneeded {} \;

staticdeps-compileall:
	bash -c 'python --version'
	# Seems like the compileall module does not return a non-zero exit code when failing
	bash -c 'if ( python -m compileall -x py2only kolibri -q | grep SyntaxError ) ; then echo "Failed to compile kolibri/dist/" ; exit 1 ; else exit 0 ; fi'

writeversion:
	python -c "import kolibri; print(kolibri.__version__)" > kolibri/VERSION
	@echo ""
	@echo "Current version is now `cat kolibri/VERSION`"

preseeddb:
	./build_tools/preseed_home.sh

setrequirements:
	rm -r requirements.txt || true # remove requirements.txt
	git checkout -- requirements.txt # restore requirements.txt
	python build_tools/customize_requirements.py

buildconfig:
	rm -r kolibri/utils/build_config/* || true # remove everything
	git checkout -- kolibri/utils/build_config # restore __init__.py
	python build_tools/customize_build.py

dist: setrequirements writeversion staticdeps staticdeps-cext strip-staticdeps buildconfig i18n-extract-frontend assets i18n-django-compilemessages preseeddb
	python setup.py sdist --format=gztar > /dev/null # silence the sdist output! Too noisy!
	python setup.py bdist_wheel
	ls -l dist

pex:
	ls dist/*.whl | while read whlfile; do version=$$(python ./build_tools/read_whl_version.py $$whlfile); pex $$whlfile --disable-cache -o dist/kolibri-`echo $$version | sed 's/+/_/g'`.pex -m kolibri --python-shebang=/usr/bin/python3; done

i18n-extract-backend:
	cd kolibri && python -m kolibri manage makemessages -- -l en --ignore 'node_modules/*' --ignore 'kolibri/dist/*' --all

i18n-extract-frontend:
	yarn run makemessages

i18n-extract: i18n-extract-frontend i18n-extract-backend

i18n-transfer-context:
	yarn transfercontext

i18n-django-compilemessages:
	# Change working directory to kolibri/ such that compilemessages
	# finds only the .po files nested there.
	cd kolibri && PYTHONPATH="..:$$PYTHONPATH" python -m kolibri manage compilemessages --skip-update

i18n-upload: i18n-extract
	python packages/kolibri-tools/lib/i18n/crowdin.py upload-sources ${branch}

i18n-pretranslate:
	python packages/kolibri-tools/lib/i18n/crowdin.py pretranslate ${branch}

i18n-pretranslate-approve-all:
	python packages/kolibri-tools/lib/i18n/crowdin.py pretranslate ${branch} --approve-all

i18n-download-translations:
	python packages/kolibri-tools/lib/i18n/crowdin.py rebuild-translations ${branch}
	python packages/kolibri-tools/lib/i18n/crowdin.py download-translations ${branch}
	yarn exec kolibri-tools i18n-code-gen -- --output-dir ./packages/kolibri/utils/internal
	$(MAKE) i18n-django-compilemessages
	yarn exec kolibri-tools i18n-create-message-files -- --pluginFile ./build_tools/build_plugins.txt

i18n-download-source-fonts:
	python packages/kolibri-tools/lib/i18n/fonts.py download-source-fonts

i18n-regenerate-fonts:
	python packages/kolibri-tools/lib/i18n/fonts.py generate-full-fonts
	python packages/kolibri-tools/lib/i18n/fonts.py generate-subset-fonts

i18n-download: i18n-download-translations i18n-regenerate-fonts i18n-transfer-context

i18n-screenshot-report:
	python packages/kolibri-tools/lib/i18n/crowdin.py screenshot-report ${branch}

i18n-transfer-screenshots:
	python packages/kolibri-tools/lib/i18n/crowdin.py transfer-screenshots ${branch} ${source}

i18n-install-font:
	python packages/kolibri-tools/lib/i18n/fonts.py add-source-font ${name}

i18n-download-glossary:
	python packages/kolibri-tools/lib/i18n/crowdin.py download-glossary

i18n-upload-glossary:
	python packages/kolibri-tools/lib/i18n/crowdin.py upload-glossary

docker-clean:
	rm -f *.iid *.cid

docker-whl: docker-envlist docker-clean
	docker build \
		--iidfile docker-whl.iid \
		-f docker/build_whl.dockerfile .
	docker run \
		--env-file ./docker/env.list \
		--cidfile docker-whl.cid \
		-v yarn_cache:/yarn_cache \
		-v cext_cache:/cext_cache \
		`cat docker-whl.iid`
	docker cp `cat docker-whl.cid`:/kolibri/dist/. dist/
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
