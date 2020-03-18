.PHONY: help translations dist config-nginx orig

help:
	@echo "translations - download available crowdin translations"
	@echo "release - prepare a release"
	@echo "dist - package"
	@echo "orig - creates ../kolibri-server_n.n.n.orig.tar.gz"
	@echo $(shell dpkg-parsechangelog -SVersion)

translations:
	@echo "Ensure to set the project crowdin api in env variable called CROWDIN_API_KEY"
	@echo "Also remember the project must have been built in crowdin to have the changes applied"
	@wget -O nginx_error_page/all.zip https://api.crowdin.com/api/project/kolibri-server/download/all.zip?key=$$CROWDIN_API_KEY
	@unzip -o -d nginx_error_page nginx_error_page/all.zip
	@rm -f nginx_error_page/all.zip
	@echo "Don't forget to update nginx.conf if new translations have been added"

release: translations
	dch -i

dist: orig
	dpkg-buildpackage -S

# Solution from: https://stackoverflow.com/a/43145972/405682
VERSION:=$(shell dpkg-parsechangelog -S Version | sed -rne 's,([^-\+]+)+(\+dfsg)*.*,\1,p'i)
UPSTREAM_PACKAGE:=kolibri-server_${VERSION}.orig.tar.gz
orig:
	@echo "Creating .orig tarball: ../${UPSTREAM_PACKAGE}"
	tar caf ../${UPSTREAM_PACKAGE} . --exclude debian --exclude .git
	debuild -uc -us
