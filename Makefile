SHELL := /bin/bash
CROWDIN_BRANCH := release

# List most target names as 'PHONY' to prevent Make from thinking it will be creating a file of the same name
.PHONY: help clean clean-assets clean-build clean-pyc clean-docs lint test test-all assets coverage docs release staticdeps staticdeps-cext strip-staticdeps writeversion setrequirements buildconfig pex i18n-extract-frontend i18n-extract-backend i18n-transfer-context i18n-extract i18n-django-compilemessages i18n-upload i18n-pretranslate i18n-pretranslate-approve-all i18n-download i18n-regenerate-fonts i18n-stats i18n-install-font i18n-download-translations i18n-download-glossary i18n-upload-glossary docker-demoserver docker-devserver docker-envlist


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
	@echo "lint: lint and format the codebase with prek hooks"
	@echo "test: run tests quickly with the default Python"
	@echo "test-all: run tests with the default Python (CI tests all versions)"
	@echo "test-with-postgres: run tests quickly with a temporary postgresql backend"
	@echo "coverage: run tests, recording and printing out Python code coverage"
	@echo "docs: generate developer documentation"
	@echo "start-foreground-with-postgres: run Kolibri in foreground mode with a temporary postgresql backend"
	@echo ""
	@echo "Internationalization"
	@echo "--------------------"
	@echo ""
	@echo "i18n-extract: extract all strings from application (both front- and back-end)"
	@echo "i18n-upload: upload sources to Crowdin"
	@echo "i18n-pretranslate: pretranslate on Crowdin"
	@echo "i18n-pretranslate-approve: pretranslate and pre-approve on Crowdin"
	@echo "i18n-download: download strings from Crowdin"
	@echo "i18n-download-source-fonts: retrieve source Google Noto fonts"
	@echo "i18n-regenerate-fonts: regenerate font files"
	@echo "i18n-stats: output information about translation status"
	@echo "i18n-django-compilemessages: compiles .po files to .mo files for Django"
	@echo "i18n-install-font name=<noto-font>: Downloads and installs a new or updated font"
	@echo "i18n-download-glossary: Download the glossary file from crowdin and update locally
	@echo "i18n-upload-glossary: Upload the local file to crowdin


clean: clean-build clean-pyc clean-assets clean-staticdeps

clean-assets:
	pnpm run clean

clean-build:
	rm -f kolibri/VERSION
	rm -f kolibri/_version.py
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
	prek run --all-files

test:
	uv run python -O -m pytest

test-all:
	@echo "Run tests for a specific Python version with: uv run --python 3.X pytest"
	@echo "CI runs tests across all supported Python versions."
	uv run pytest

test-morango-integ:
	export INTEGRATION_TEST=1; \
	python -O -m pytest kolibri/core/auth/test/test_morango_integration.py

%-with-postgres:
	@echo -e "\e[33mWARNING: for testing purposes only; postgresql database backend is ephemeral\e[0m"
	@echo -e "\e[36mINFO: run 'docker compose -v' to remove the database volume\e[0m"
	export KOLIBRI_DATABASE_ENGINE=postgres; \
	export KOLIBRI_DATABASE_NAME=default; \
	export KOLIBRI_DATABASE_USER=postgres; \
	export KOLIBRI_DATABASE_PASSWORD=postgres; \
	export KOLIBRI_DATABASE_HOST=127.0.0.1; \
	export KOLIBRI_DATABASE_PORT=15432; \
	set -ex; \
	function _on_interrupt() { docker compose down; }; \
	trap _on_interrupt SIGINT SIGTERM SIGKILL ERR; \
	docker compose up --detach; \
	container_id=$$(docker compose ps -q postgres); \
	until [ "$$(docker inspect --format='{{.State.Health.Status}}' $$container_id)" = "healthy" ]; do \
		echo "$(date) - waiting for postgres (health=$$(docker inspect --format='{{.State.Health.Status}}' $$container_id))..."; \
		sleep 1; \
	done; \
	$(MAKE) -e $(subst -with-postgres,,$@); \
	docker compose down -v

start-foreground:
	kolibri start --foreground

assets:
	pnpm install
	pnpm run build
	pnpm run compress

coverage:
	uv run coverage run -m pytest
	uv run coverage report -m

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
	# Resolve the bundled runtime dependencies from the `base` group in
	# pyproject.toml, pinned to Python 3.6 compatible versions.
	uv pip install --python-version 3.6 --target kolibri/dist --group base
	# requirements.txt only carries any EXTRA_REQUIREMENTS injected by
	# setrequirements (empty by default).
	uv pip install --python-version 3.6 --target kolibri/dist -r "requirements.txt"
	rm -rf kolibri/dist/*.egg-info
	rm -r kolibri/dist/man kolibri/dist/bin || true # remove the two folders introduced by pip 10

staticdeps-cext:
	rm -rf kolibri/dist/cext || true # remove everything
	uv run --script build_tools/install_cexts.py --file "requirements/cext.txt" # pip install c extensions
	uv pip install --python-version 3.6 --target kolibri/dist/cext -r "requirements/cext_noarch.txt" --no-deps
	rm -rf kolibri/dist/*.egg-info

strip-staticdeps:
	find kolibri/dist -name "*.so" -exec strip --strip-unneeded {} \;
	find kolibri/dist -name "*.so" -exec aarch64-linux-gnu-strip --strip-unneeded {} \;
	find kolibri/dist -name "*.so" -exec arm-linux-gnueabihf-strip --strip-unneeded {} \;

staticdeps-compileall:
	bash -c 'python --version'
	# Seems like the compileall module does not return a non-zero exit code when failing
	bash -c 'if ( python -m compileall -x py2only kolibri -q | grep SyntaxError ) ; then echo "Failed to compile kolibri/dist/" ; exit 1 ; else exit 0 ; fi'

set-no-uv-python-version-for-tests:
	@DESC=$$(git describe --tags --always | sed 's/^v//'); \
	VERSION=$$(echo $$DESC | sed -E 's/^([0-9.]+)-([0-9]+)-g(.+)/\1.dev\2+g\3/'); \
	echo '# file generated by Makefile for testing Python versions without uv support' > kolibri/_version.py; \
	echo "__version__ = version = \"$$VERSION\"" >> kolibri/_version.py; \
	echo "Set version to $$VERSION"

writeversion:
	uv run python -c "import kolibri; print(kolibri.__version__)" > kolibri/VERSION
	@echo ""
	@echo "Current version is now `cat kolibri/VERSION`"

preseeddb:
	./build_tools/preseed_home.sh

setrequirements:
	rm -r requirements.txt || true # remove requirements.txt
	git checkout -- requirements.txt # restore requirements.txt
	uv run --script build_tools/customize_requirements.py

buildconfig:
	rm -r kolibri/utils/build_config/* || true # remove everything
	git checkout -- kolibri/utils/build_config # restore __init__.py
	python build_tools/customize_build.py

dist: setrequirements writeversion staticdeps staticdeps-cext strip-staticdeps buildconfig i18n-extract-frontend assets i18n-django-compilemessages preseeddb
	uv build
	ls -l dist

pex:
	ls dist/*.whl | while read whlfile; do version=$$(uv run --script ./build_tools/read_whl_version.py $$whlfile); uvx --from "pex==2.1.153" pex $$whlfile --disable-cache -o dist/kolibri-`echo $$version | sed 's/+/_/g'`.pex -m kolibri --python-shebang=/usr/bin/python3; done

# Kolibri plugins packaged under python_packages/. Each entry is the inner
# <dist>/<module> dir (the importable package). kolibri_plugin.py marks a real
# plugin module, so test/ dirs are excluded. build_plugins.txt is intentionally
# NOT used here — it also drives the webpack build.
# NOTE: discovery here is automatic. A new plugin's FRONTEND strings sync via the
# python_packages/** wildcard entry in crowdin.yml (no edit needed). A new plugin's
# first BACKEND string, however, needs a hand-written PO entry in crowdin.yml — its
# django.po basename collides otherwise — or its strings extract locally but never
# sync (see crowdin.yml).
I18N_PLUGIN_DIRS := $(shell find python_packages -mindepth 3 -maxdepth 3 -name kolibri_plugin.py -printf '%h ')
# Subset that ship a frontend bundle; only these are valid for --plugins extraction
# (webpack_json.py raises ImportError for a --plugins module with no buildConfig.js).
I18N_PLUGIN_FRONTEND_DIRS := $(shell find python_packages -mindepth 3 -maxdepth 3 -name buildConfig.js -not -path '*/node_modules/*' -printf '%h ')

i18n-extract-backend:
	cd kolibri && uv run python -m kolibri manage makemessages -- -l en --ignore 'node_modules/*' --ignore 'kolibri/dist/*' --all
	@for dir in $(I18N_PLUGIN_DIRS); do \
		echo "Extracting backend messages for $$dir"; \
		mkdir -p $$dir/locale; \
		( cd $$dir && PYTHONPATH="$(CURDIR):$$PYTHONPATH" uv run --project "$(CURDIR)" python -m kolibri manage makemessages -- -l en --ignore 'node_modules/*' ) || exit 1; \
	done

i18n-extract-frontend:
	pnpm run makemessages
	# Extract each frontend plugin's messages to its own locale/. --plugins resolves
	# buildConfig.js via the *installed* package (webpack_json.py files(module)), so
	# skip any plugin whose package is not importable here — e.g. `make dist`, which
	# installs only the root project, not the python_packages/* members. Where the
	# members are installed (uv sync --all-packages) they extract normally.
	@for dir in $(I18N_PLUGIN_FRONTEND_DIRS); do \
		module=$$(basename $$dir); \
		if ! python -c "import $$module" >/dev/null 2>&1; then \
			echo "Skipping frontend messages for $$module (package not installed)"; \
			continue; \
		fi; \
		echo "Extracting frontend messages for $$module"; \
		pnpm exec kolibri-i18n extract-messages --plugins $$module || exit 1; \
	done

i18n-extract: i18n-extract-frontend i18n-extract-backend

i18n-transfer-context:
	pnpm transfercontext

i18n-django-compilemessages:
	# Change working directory to kolibri/ such that compilemessages
	# finds only the .po files nested there.
	cd kolibri && PYTHONPATH="..:$$PYTHONPATH" uv run python -m kolibri manage compilemessages --skip-update
	# Compile each python_packages/* plugin's .po from inside its own dir so
	# compilemessages finds only that plugin's catalog. A plugin with no locale/
	# (or a header-only .po) is a harmless no-op. --project/PYTHONPATH pin the root
	# uv project so uv does not pick up the member pyproject.toml (same as extract).
	@for dir in $(I18N_PLUGIN_DIRS); do \
		echo "Compiling messages for $$dir"; \
		( cd $$dir && PYTHONPATH="$(CURDIR):$$PYTHONPATH" uv run --project "$(CURDIR)" python -m kolibri manage compilemessages --skip-update ) || exit 1; \
	done

i18n-upload: i18n-extract
	pnpm exec crowdin upload sources --branch ${CROWDIN_BRANCH}

i18n-pretranslate:
	pnpm exec crowdin pre-translate --branch ${CROWDIN_BRANCH} --translate-untranslated-only --method=tm

i18n-pretranslate-approve-all:
	pnpm exec crowdin pre-translate --branch ${CROWDIN_BRANCH} --translate-untranslated-only --method=tm --auto-approve-option=all

i18n-download-translations: i18n-extract-frontend
	touch kolibri/locale/.crowdin-download-marker
	pnpm exec crowdin download --branch ${CROWDIN_BRANCH}
	@if [ -z "$$(find kolibri/locale/*/LC_MESSAGES -type f \( -name '*.po' -o -name '*.csv' \) -newer kolibri/locale/.crowdin-download-marker 2>/dev/null)" ]; then \
		echo "❌ ERROR: No translation files were downloaded - Crowdin download may have failed silently"; \
		echo "Check the output above for errors during the download process"; \
		rm -f kolibri/locale/.crowdin-download-marker; \
		exit 1; \
	fi
	@echo "✅ Translation files downloaded successfully"
	rm -f kolibri/locale/.crowdin-download-marker
	uv run python build_tools/i18n/cleanup_unsupported_languages.py
	pnpm exec kolibri-i18n code-gen --output-dir ./packages/kolibri/utils/internal
	$(MAKE) i18n-django-compilemessages
	pnpm exec kolibri-i18n create-message-files --pluginFile ./build_tools/build_plugins.txt --ignore '**/node_modules/!(kolibri-common)/**','**/static/**'
	# Generate each frontend plugin's <namespace>-messages.json into its own locale/.
	# Frontend plugins only: create-message-files --plugins routes through plugin_data,
	# which raises ImportError for a module with no buildConfig.js. Skip plugins whose
	# package is not importable here (same reason as i18n-extract-frontend).
	@for dir in $(I18N_PLUGIN_FRONTEND_DIRS); do \
		module=$$(basename $$dir); \
		if ! python -c "import $$module" >/dev/null 2>&1; then \
			echo "Skipping message files for $$module (package not installed)"; \
			continue; \
		fi; \
		echo "Creating message files for $$module"; \
		pnpm exec kolibri-i18n create-message-files --plugins $$module --ignore '**/node_modules/!(kolibri-common)/**','**/static/**' || exit 1; \
	done

i18n-download-source-fonts:
	uv run --script build_tools/i18n/fonts.py download-source-fonts

i18n-regenerate-fonts:
	uv run --script build_tools/i18n/fonts.py generate-fonts

i18n-download: i18n-download-translations i18n-regenerate-fonts

i18n-install-font:
	uv run --script build_tools/i18n/fonts.py add-source-font ${name}

i18n-download-glossary:
	pnpm exec crowdin glossary download

i18n-upload-glossary:
	pnpm exec crowdin glossary upload

# Build a docker image for the latest version of Kolibri, tag it as `latest`
docker-build:
	$(MAKE) -C docker build

# Build a docker image for a specific version of Kolibri: make build-0.19.3
docker-build-%:
	$(MAKE) -C docker build-$(subst docker-build-,,$@)
