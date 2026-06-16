.PHONY: clean get-whl install-whl clean-whl build-mac-app pyinstaller build-dmg compile-mo needs-version

PYTHON_EXEC := uv run python

ifeq ($(OS),Windows_NT)
    OSNAME := WIN32
	PYTHON_EXEC_WITH_PATH := PYTHONPATH="./src;./kolibrisrc;%PYTHONPATH%" $(PYTHON_EXEC)
else
    OSNAME := $(shell uname -s)
	PYTHON_EXEC_WITH_PATH := PYTHONPATH="./src:./kolibrisrc:$$PYTHONPATH" $(PYTHON_EXEC)
endif


guard-%:
	@ if [ "${${*}}" = "" ]; then \
		echo "Environment variable $* not set"; \
		exit 1; \
	fi

needs-version:
	$(eval KOLIBRI_VERSION ?= $(shell uv run --group build python -c "import os; import sys; sys.path = [os.path.abspath('kolibrisrc')] + sys.path; from pkginfo import Installed; print(Installed('kolibri').version)"))
	$(eval APP_VERSION ?= $(shell uv run --group build python -m setuptools_scm))

clean:
	rm -rf build dist

clean-whl:
	rm -rf whl
	mkdir whl

install-whl:
	rm -rf kolibrisrc
	uv pip install ${whl} -t kolibrisrc/
	# Read SQLAlchemy version from the unpacked whl file to avoid hard coding.
	# Manually install the sqlalchemy version
	@version=$$(grep -Eo '__version__ = "([0-9]+\.[0-9]+\.[0-9]+)"' kolibrisrc/kolibri/dist/sqlalchemy/__init__.py | grep -Eo "([0-9]+\.[0-9]+\.[0-9]+)"); \
	uv pip install sqlalchemy==$$version --no-binary :all:
	# Delete sqlalchemy from the dist folder
	rm -rf kolibrisrc/kolibri/dist/sqlalchemy
	rm -rf kolibrisrc/kolibri/dist/SQLAlchemy*
	# Cleanup the py2only folder
	rm -rf kolibrisrc/kolibri/dist/py2only
	# Delete cextensions folder
	rm -rf kolibrisrc/kolibri/dist/cext
	# This doesn't exist in 0.15, so don't error if it doesn't exist.
	echo "3.3.1" > kolibrisrc/kolibri/dist/importlib_resources/version.txt || true
	$(MAKE) loading-pages

loading-pages: needs-version
	# -X utf8 ensures Python uses UTF-8 for I/O, fixing UnicodeEncodeError on Windows.
ifeq ($(OS),Windows_NT)
	$(PYTHON_EXEC_WITH_PATH) -X utf8 -m kolibri manage loadingpage --output-dir src/kolibri_app/assets --version-text "${KOLIBRI_VERSION}-${APP_VERSION}"
else
	$(PYTHON_EXEC_WITH_PATH) -X utf8 -m kolibri manage loadingpage --output-dir src/kolibri_app/assets --version-text "${KOLIBRI_VERSION}-${APP_VERSION}"
endif

get-whl: clean-whl
	# Get the base filename from the URL, which might include a query string
	$(eval FILENAME_WITH_QUERY := $(shell basename "$(whl)"))
	# Strip the query string to get the final, clean filename
	$(eval CLEAN_FILENAME := $(shell echo "$(FILENAME_WITH_QUERY)" | sed 's/\?.*//'))
	# Define the final output path
	$(eval OUTPUT_PATH := whl/$(CLEAN_FILENAME))
	# Download the file directly to the correct, clean path
	wget -O "$(OUTPUT_PATH)" "$(whl)"
	# Call the install-whl target with the clean path
	$(MAKE) install-whl whl="$(OUTPUT_PATH)"

dependencies:
	PYINSTALLER_COMPILE_BOOTLOADER=1 uv sync --group build --no-binary-package pyinstaller
	$(PYTHON_EXEC) -c "import PyInstaller; import os; os.truncate(os.path.join(PyInstaller.__path__[0], 'hooks', 'rthooks', 'pyi_rth_django.py'), 0)"

build-mac-app:
	$(MAKE) pyinstaller

pyinstaller: clean
	mkdir -p logs
	$(PYTHON_EXEC) -OO -m PyInstaller kolibri.spec

build-dmg: needs-version
	$(PYTHON_EXEC) -m dmgbuild -s build_config/dmgbuild_settings.py "Kolibri ${KOLIBRI_VERSION}" dist/kolibri-${KOLIBRI_VERSION}.dmg

.PHONY: webview2
# Download WebView2 runtime installer
webview2:
	@if [ ! -f installer/MicrosoftEdgeWebView2RuntimeInstallerX64.exe ]; then \
		echo "Downloading WebView2 full installer..."; \
		( \
			trap 'echo "Interrupted. Cleaning up..."; rm -f installer/MicrosoftEdgeWebView2RuntimeInstallerX64.exe; exit 1' INT TERM; \
			wget https://go.microsoft.com/fwlink/?linkid=2124701 -O installer/MicrosoftEdgeWebView2RuntimeInstallerX64.exe || { \
				echo "\Download failed. Cleaning up..."; \
				rm -f installer/MicrosoftEdgeWebView2RuntimeInstallerX64.exe; \
				exit 1; \
			} \
		); \
	else \
		echo "WebView2 full installer already present."; \
	fi

# Windows Installer Build
.PHONY: build-installer-windows
build-installer-windows: translations-compile needs-version webview2
ifeq ($(OS),Windows_NT)
	# Assumes Inno Setup is installed in the default location.
	# MSYS_NO_PATHCONV=1 prevents Git Bash/MINGW from converting the /D flag into a file path.
	MSYS_NO_PATHCONV=1 "C:\Program Files (x86)\Inno Setup 6\iscc.exe" /DAppVersion=$(KOLIBRI_VERSION) installer/kolibri.iss
else
	@echo "Windows installer can only be built on Windows."
endif

INNO_DEFAULT_ISL ?= C:/Program Files (x86)/Inno Setup 6/Default.isl
INNO_LANGUAGES_DIR ?= C:/Program Files (x86)/Inno Setup 6/Languages

TRANSLATIONS_DIR := installer/translations
LOCALE_DIR := $(TRANSLATIONS_DIR)/locale
TEMPLATE_ISL := $(TRANSLATIONS_DIR)/en.isl
SCRIPT_ISL_TO_PO := $(TRANSLATIONS_DIR)/isl_to_po.py
SCRIPT_PO_TO_ISL := $(TRANSLATIONS_DIR)/po_to_isl.py

# New Language Target
# Usage: make new-language LANG=es_ES
.PHONY: new-language
new-language:
	$(MAKE) guard-LANG
	@echo "Scaffolding new PO file for locale '$(LANG)'..."
	$(PYTHON_EXEC) $(SCRIPT_ISL_TO_PO) \
		--template $(TEMPLATE_ISL) \
		--output $(LOCALE_DIR)/$(LANG)/messages.po \
		--lang "$(LANG)" \
		--inno-dir "$(INNO_LANGUAGES_DIR)" \
		--no-overwrite

# Export Source Target (en)
.PHONY: translations-export-source
translations-export-source:
	@echo "Exporting master en.isl to locale/en/messages.po (Source)..."
	$(PYTHON_EXEC) $(SCRIPT_ISL_TO_PO) \
		--template $(TEMPLATE_ISL) \
		--output $(LOCALE_DIR)/en/messages.po \
		--lang "en"

# Compile Target (PO -> ISL)
.PHONY: translations-compile
translations-compile:
	@echo "Compiling PO files to ISL format..."
	@# Loop through directories in translations/locale/
	@for lang_dir in $(LOCALE_DIR)/*; do \
		if [ -d "$$lang_dir" ]; then \
			lang_code=$$(basename "$$lang_dir"); \
			\
			# Skip 'en' because we use the master en.isl template directly \
			if [ "$$lang_code" = "en" ]; then \
				continue; \
			fi; \
			\
			po_file="$$lang_dir/messages.po"; \
			isl_file="$$lang_dir/$${lang_code}.isl"; \
			\
			if [ -f "$$po_file" ]; then \
				echo "  -> Processing $$lang_code ..."; \
				$(PYTHON_EXEC) $(SCRIPT_PO_TO_ISL) \
					-t $(TEMPLATE_ISL) \
					-i "$$po_file" \
					-o "$$isl_file" \
					-l "$$lang_code"; \
			fi \
		fi \
	done

.PHONY: update-translations
update-translations:
	@echo "Updating master language file from '$(INNO_DEFAULT_ISL)'..."
	$(PYTHON_EXEC) installer/translations/update_from_inno_default.py \
		--new-default "$(INNO_DEFAULT_ISL)" \
		--project-master "$(TEMPLATE_ISL)"
	@echo "Update complete. Please review update_report.txt and commit the changes to en.isl."

compile-mo:
	find src/kolibri_app/locales -name LC_MESSAGES -exec msgfmt {}/wxapp.po -o {}/wxapp.mo \;

.PHONY: wxapp-extract-strings
wxapp-extract-strings:
	xgettext \
		--language=Python \
		--keyword=_ \
		--from-code=UTF-8 \
		--add-comments=i18n \
		--no-wrap \
		--package-name=kolibri-app \
		--output=- \
		src/kolibri_app/*.py \
	| msgen \
		--no-wrap \
		--output=src/kolibri_app/locales/en/LC_MESSAGES/wxapp.po \
		-
	sed -i \
		-e '1s/# SOME DESCRIPTIVE TITLE\./# kolibri-app./' \
		-e 's/PO-Revision-Date: YEAR-MO-DA HO:MI+ZONE/PO-Revision-Date: /' \
		-e 's/Last-Translator: FULL NAME <EMAIL@ADDRESS>/Last-Translator: Learning Equality <dev@learningequality.org>/' \
		-e 's/Language-Team: LANGUAGE <LL@li.org>/Language-Team: Learning Equality <dev@learningequality.org>/' \
		-e 's/"Language: \\n"/"Language: en\\n"/' \
		src/kolibri_app/locales/en/LC_MESSAGES/wxapp.po

.PHONY: i18n-upload
i18n-upload: translations-export-source wxapp-extract-strings
	crowdin upload sources

.PHONY: i18n-download
i18n-download:
	crowdin download
	$(MAKE) compile-mo

.PHONY: codesign-mac-app
codesign-mac-app:
	$(MAKE) guard-MAC_CODESIGN_IDENTITY
# Mac App Code Signing
# CODESIGN should start with "Developer ID Application: ..."
	xattr -cr dist/Kolibri.app
	codesign \
		--sign "Developer ID Application: $(MAC_CODESIGN_IDENTITY)" \
		--verbose=3 \
		--deep \
		--timestamp \
		--force \
		--strict \
		--entitlements build_config/entitlements.plist \
		-o runtime \
		dist/Kolibri.app
	codesign --display --verbose=3 --entitlements :- dist/Kolibri.app
	codesign --verify --verbose=3 --deep --strict=all dist/Kolibri.app

.PHONY: codesign-dmg
codesign-dmg: needs-version
	$(MAKE) guard-MAC_CODESIGN_IDENTITY
	xattr -cr dist/kolibri-${KOLIBRI_VERSION}.dmg
	codesign \
		--sign "Developer ID Application: $(MAC_CODESIGN_IDENTITY)" \
		--verbose=3 \
		--deep \
		--timestamp \
		--force \
		--strict \
		--entitlements build_config/entitlements.plist \
		-o runtime \
		dist/kolibri-${KOLIBRI_VERSION}.dmg

.PHONY: notarize-dmg
notarize-dmg: needs-version
	$(MAKE) guard-MAC_NOTARIZE_USERNAME
	$(MAKE) guard-MAC_NOTARIZE_PASSWORD
	$(MAKE) guard-MAC_NOTARIZE_TEAM_ID
	./notarize-dmg.sh "./dist/kolibri-${KOLIBRI_VERSION}.dmg"


run-dev:
ifeq ($(OS),Windows_NT)
	$(PYTHON_EXEC_WITH_PATH) -m kolibri_app
else
	$(PYTHON_EXEC_WITH_PATH) -m kolibri_app
endif
