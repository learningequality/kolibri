.PHONY: clean get-whl build-mac-app pyinstaller build-dmg compile-mo codesign-windows codesign-mac needs-version

guard-%:
	@ if [ "${${*}}" = "" ]; then \
		echo "Environment variable $* not set"; \
		exit 1; \
	fi

needs-version:
	$(eval KOLIBRI_VERSION ?= $(shell python -c "import kolibri; print(kolibri.__version__)"))
	$(eval APP_VERSION ?= $(shell python -c "import kolibri_app; print(kolibri_app.__version__)"))

clean:
	rm -rf build dist src/kolibri

get-whl:
	mkdir dist
	wget -O dist/kolibri.whl "${whl}"
	pip install dist/kolibri.whl

build-mac-app:
	pip3 install .
	mkdir -p logs
	$(eval LIBPYTHON_FOLDER = $(shell python3 -c 'from distutils.sysconfig import get_config_var; print(get_config_var("LIBDIR"))'))
	ln -s ${LIBPYTHON_FOLDER}/libpython3.9m.dylib ${LIBPYTHON_FOLDER}/libpython3.9.dylib
	$(MAKE) pyinstaller

pyinstaller: clean
	python3 -OO -m PyInstaller kolibri.spec

build-dmg: needs_version
	dmgbuild -s build_config/dmgbuild_settings.py kolibri-${KOLIBRI_VERSION}-${APP_VERSION}.app dist/kolibri-${KOLIBRI_VERSION}-${APP_VERSION}.dmg

compile-mo:
	find src/kolibri_app/locales -name LC_MESSAGES -exec msgfmt {}/wxapp.po -o {}/wxapp.mo \;

codesign-windows:
	$(MAKE) guard-WIN_CODESIGN_PFX
	$(MAKE) guard-WIN_CODESIGN_PWD
	$(MAKE) guard-WIN_CODESIGN_CERT
	C:\Program Files (x86)\Windows Kits\8.1\bin\x64\signtool.exe sign /f ${WIN_CODESIGN_PFX} /p ${WIN_CODESIGN_PWD} /ac ${WIN_CODESIGN_CERT} /tr http://timestamp.ssl.trustwave.com /td SHA256 /fd SHA256 dist/kolibri-${KOLIBRI_VERSION}-${APP_VERSION}.exe

codesign-mac: needs_version
	$(MAKE) guard-MAC_DEV_ID_EMAIL
	$(MAKE) guard-MAC_CODESIGN_PWD
	$(MAKE) guard-MAC_CODESIGN_ID
	$(MAKE) build-dmg
	./codesign-mac.sh
