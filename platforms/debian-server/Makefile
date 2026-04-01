.PHONY: help error-pages deb dist config-nginx orig \
       setup-ppa install-build-deps install-upload-deps install-kolibri

# Auto-detect sudo: empty in containers (root), "sudo" on dev machines
SUDO := $(shell [ "$$(id -u)" = "0" ] && echo "" || echo "sudo")
APT_UPDATE := $(SUDO) apt-get update
APT_INSTALL := $(SUDO) apt-get install -y

help:
	@echo "changelog          - prepare debian/changelog file with the new version number"
	@echo "error-pages        - use kolibri command to create all the error pages and its translations"
	@echo "release            - prepare a release"
	@echo "dist               - package"
	@echo "orig               - creates ../kolibri-server_n.n.n.orig.tar.gz"
	@echo "setup-ppa          - add Learning Equality PPA"
	@echo "install-build-deps - install devscripts, debhelper, dpkg-dev"
	@echo "install-upload-deps- install build deps + dput, python3-launchpadlib"
	@echo "install-kolibri    - preseed debconf and install kolibri from PPA"
	@echo $(shell dpkg-parsechangelog -SVersion)

setup-ppa:
	$(APT_INSTALL) gpg
	./test/setup_ppa.sh

install-build-deps:
	$(APT_UPDATE)
	$(APT_INSTALL) build-essential devscripts debhelper dpkg-dev

install-upload-deps: install-build-deps
	$(APT_INSTALL) dput python3-launchpadlib

install-kolibri: setup-ppa
	echo "kolibri kolibri/init boolean false" | $(SUDO) debconf-set-selections
	echo "kolibri kolibri/user string kolibri" | $(SUDO) debconf-set-selections
	$(APT_UPDATE)
	$(APT_INSTALL) kolibri

error-pages:
	rm -Rf $(CURDIR)/error_pages
	kolibri manage loadingpage --reload --output-dir $(CURDIR)/error_pages --version-text $(shell dpkg-parsechangelog -SVersion)

changelog:
	dch -i

release: changelog  error-pages orig

deb: error-pages orig
	dpkg-buildpackage -b -us -uc

dist: error-pages orig
	@mkdir -p dist
	echo "Building unsigned package..."
	dpkg-buildpackage -S -us -uc -sa
	mv ../kolibri-server_$(VERSION)* dist/
	@echo "Package built successfully!"
# build and sign (signing uses environment GPG_KEY_ID and GPG_PASSPHRASE)
sign-and-upload: dist
	@echo "Signing and uploading package..."
	@test -n "$$GPG_KEY_ID" || { echo "Error: GPG_KEY_ID is not set"; exit 1; }
	@test -n "$$GPG_PASSPHRASE" || { echo "Error: GPG_PASSPHRASE is not set"; exit 1; }
	@printf '%s' "$$GPG_PASSPHRASE" > /tmp/.gpg-passphrase
	debsign -p"gpg --batch --pinentry-mode loopback --passphrase-file /tmp/.gpg-passphrase" \
		-k "$$GPG_KEY_ID" dist/*.changes
	@rm -f /tmp/.gpg-passphrase
	@echo "Uploading to PPA..."
	dput --unchecked ppa:learningequality/kolibri-proposed dist/*.changes
	@echo "Upload completed successfully!"

# Solution from: https://stackoverflow.com/a/43145972/405682
VERSION:=$(shell dpkg-parsechangelog -S Version | sed -rne 's,([^-\+]+)+(\+dfsg)*.*,\1,p'i)
UPSTREAM_PACKAGE:=kolibri-server_${VERSION}.orig.tar.gz
orig:
	@echo "Creating .orig tarball: ../${UPSTREAM_PACKAGE}"
	@tar --exclude-from=.tarignore -czf ../${UPSTREAM_PACKAGE} -C .. $(notdir $(CURDIR))
