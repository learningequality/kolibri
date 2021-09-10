.PHONY: clean get-whl build-mac-app pyinstaller build-dmg compile-mo codesign-windows codesign-mac needs-version

guard-%:
	@ if [ "${${*}}" = "" ]; then \
		echo "Environment variable $* not set"; \
		exit 1; \
	fi

needs-version:
	$(MAKE) guard-KOLIBRI_VERSION
	$(MAKE) guard-APP_BUILD_NUMBER

clean:
	rm -rf build dist src/kolibri

get-whl:
	mkdir dist
	wget -O dist/kolibri.whl "${whl}"
	pip install dist/kolibri.whl

build-mac-app: needs-version
	pip3 install .
	export PYTHONPATH=${PYTHONPATH}:${PWD}/src/kolibri/dist
	mkdir -p logs
	export LIBPYTHON_FOLDER="$(python3 -c 'from distutils.sysconfig import get_config_var; print(get_config_var("LIBDIR"))')"
	ln -s ${LIBPYTHON_FOLDER}/libpython3.9m.dylib ${LIBPYTHON_FOLDER}/libpython3.9.dylib
	$(MAKE) pyinstaller

pyinstaller: clean
	python3 -OO -m PyInstaller kolibri.spec

build-dmg: needs_version
	dmgbuild -s build_config/dmgbuild_settings.py kolibri-${KOLIBRI_VERSION}-${APP_BUILD_NUMBER}.app dist/kolibri-${KOLIBRI_VERSION}-${APP_BUILD_NUMBER}.dmg

compile-mo:
	find src/kolibri_app/locales -name LC_MESSAGES -exec msgfmt {}/wxapp.po -o {}/wxapp.mo \;

codesign-windows:
	$(MAKE) guard-WIN_CODESIGN_PFX
	$(MAKE) guard-WIN_CODESIGN_PWD
	$(MAKE) guard-WIN_CODESIGN_CERT
	C:\Program Files (x86)\Windows Kits\8.1\bin\x64\signtool.exe sign /f ${WIN_CODESIGN_PFX} /p ${WIN_CODESIGN_PWD} /ac ${WIN_CODESIGN_CERT} /tr http://timestamp.ssl.trustwave.com /td SHA256 /fd SHA256 dist/kolibri-${KOLIBRI_VERSION}-${APP_BUILD_NUMBER}.exe

codesign-mac: needs_version
	$(MAKE) guard-MAC_DEV_ID_EMAIL
	$(MAKE) guard-MAC_CODESIGN_PWD
	$(MAKE) guard-MAC_CODESIGN_ID
	$(MAKE) build-dmg
	./codesign-mac.sh

read-version:
	echo "$(more src/kolibri/VERSION)"
