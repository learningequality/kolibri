.PHONY: help error-pages deb dist config-nginx orig

help:
	@echo "changelog - prepare debian/chanelog file with the new version number"
	@echo "error-pages - use kolibri command to create all the error pages and its translations"
	@echo "release - prepare a release"
	@echo "dist - package"
	@echo "orig - creates ../kolibri-server_n.n.n.orig.tar.gz"
	@echo $(shell dpkg-parsechangelog -SVersion)

error-pages:
	rm -Rf $(CURDIR)/error_pages
	kolibri manage loadingpage --reload --output-dir $(CURDIR)/error_pages --version-text $(shell dpkg-parsechangelog -SVersion)

changelog:
	dch -i

release: changelog  error-pages orig

deb: orig
	dpkg-buildpackage -b -us -uc

dist: orig
	@mkdir -p dist
	echo "Building unsigned package..."
	dpkg-buildpackage -S -us -uc --output-directory=dist/
	@echo "Package built successfully!"
# build and sign (signing uses environment GPG_PASSPHRASE and KEYID)
sign-and-upload: dist
	@echo "Signing and uploading package..."
	debsign -p"gpg --batch --yes --pinentry-mode loopback --passphrase $(GPG_PASSPHRASE)" dist/*.changes
	@echo "Uploading to PPA..."
	dput --unchecked ppa:learningequality/kolibri-proposed dist/*.changes
	@echo "Upload completed successfully!"

# Solution from: https://stackoverflow.com/a/43145972/405682
VERSION:=$(shell dpkg-parsechangelog -S Version | sed -rne 's,([^-\+]+)+(\+dfsg)*.*,\1,p'i)
UPSTREAM_PACKAGE:=kolibri-server_${VERSION}.orig.tar.gz
orig:
	@echo "Creating .orig tarball: ../${UPSTREAM_PACKAGE}"
	@tar --exclude-from=.tarignore -czf ../${UPSTREAM_PACKAGE} -C .. $(notdir $(CURDIR))
