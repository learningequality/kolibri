.PHONY: clean get-whl build-mac-app pyinstaller build-dmg compile-mo codesign-windows codesign-mac needs-version

ifeq ($(OS),Windows_NT)
    OSNAME := WIN32
else
    OSNAME := $(shell uname -s)
endif

guard-%:
	@ if [ "${${*}}" = "" ]; then \
		echo "Environment variable $* not set"; \
		exit 1; \
	fi

needs-version:
	$(eval KOLIBRI_VERSION ?= $(shell python3 -c "import os; import sys; sys.path = [os.path.abspath('kolibri')] + sys.path; import kolibri; print(kolibri.__version__)"))
	$(eval APP_VERSION ?= $(shell python3 -c "import os; import sys; sys.path = [os.path.abspath('kolibri')] + sys.path; import kolibri_app; print(kolibri_app.__version__)"))

clean:
	rm -rf build dist

get-whl:
	rm -rf kolibri
	$(eval DLFILE = $(shell wget --content-disposition -P whl/ "${whl}" 2>&1 | grep "Saving to: " | sed 's/Saving to: ‘//' | sed 's/’//'))
	$(eval WHLFILE = $(shell echo "${DLFILE}" | sed "s/\?.*//"))
	mv "${DLFILE}" ${WHLFILE}
	pip3 install ${WHLFILE} -t kolibri/
	rm -rf kolibri/kolibri/dist/sqlalchemy

dependencies:
	pip3 install wheel
	pip3 install PyInstaller==4.5.1
	python3 -c "import PyInstaller; import os; os.truncate(os.path.join(PyInstaller.__path__[0], 'hooks', 'rthooks', 'pyi_rth_django.py'), 0)"
	pip3 install sqlalchemy==1.3.17
ifeq ($(OSNAME), Darwin)
	pip3 install dmgbuild==1.5.2
endif

build-mac-app:
	$(eval LIBPYTHON_FOLDER = $(shell python3 -c 'from distutils.sysconfig import get_config_var; print(get_config_var("LIBDIR"))'))
	test -f ${LIBPYTHON_FOLDER}/libpython3.9.dylib || ln -s ${LIBPYTHON_FOLDER}/libpython3.9m.dylib ${LIBPYTHON_FOLDER}/libpython3.9.dylib
	$(MAKE) pyinstaller

pyinstaller: clean
	mkdir -p logs
	pip3 install .
	python3 -OO -m PyInstaller kolibri.spec

build-dmg: needs-version
	python3 -m dmgbuild -s build_config/dmgbuild_settings.py "Kolibri ${KOLIBRI_VERSION}-${APP_VERSION}" dist/kolibri-${KOLIBRI_VERSION}-${APP_VERSION}.dmg

compile-mo:
	find src/kolibri_app/locales -name LC_MESSAGES -exec msgfmt {}/wxapp.po -o {}/wxapp.mo \;

codesign-windows:
	$(MAKE) guard-WIN_CODESIGN_PFX
	$(MAKE) guard-WIN_CODESIGN_PWD
	$(MAKE) guard-WIN_CODESIGN_CERT
	C:\Program Files (x86)\Windows Kits\8.1\bin\x64\signtool.exe sign /f ${WIN_CODESIGN_PFX} /p ${WIN_CODESIGN_PWD} /ac ${WIN_CODESIGN_CERT} /tr http://timestamp.ssl.trustwave.com /td SHA256 /fd SHA256 dist/kolibri-${KOLIBRI_VERSION}-${APP_VERSION}.exe

codesign-mac: needs-version
	$(MAKE) guard-MAC_DEV_ID_EMAIL
	$(MAKE) guard-MAC_CODESIGN_PWD
	$(MAKE) guard-MAC_CODESIGN_ID
	$(MAKE) build-dmg
	./codesign-mac.sh
