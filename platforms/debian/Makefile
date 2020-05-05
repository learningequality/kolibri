.ONESHELL:

clean:
	rm -f dist/* build_src/VERSION *.cid

# Doesn't have to run if you bring in your own tarball.
build_src/%.tar.gz:
	mkdir -p build_src
	pip3 download --no-binary :all: -d build_src kolibri


# Need a reliable name so `make` knows what to look for.
# Copying rather than renaming in place so that users
# can plop their own tarball in `build_src` if so desired.
dist/kolibri_archive.tar.gz: build_src/*.tar.gz
	@# Copy to dist, where it will be copied to container
	mkdir -p dist
	cp $< $@

build_src/VERSION: dist/kolibri_archive.tar.gz
	@# Use head of archive list to determine version location
	ARCHIVE_ROOT=$$(tar -tf $< | head -1)
	VERSION_PATH=$${ARCHIVE_ROOT}kolibri/VERSION

	tar -zxvf $< $$VERSION_PATH
	mv $$VERSION_PATH $@
	rm -r $$ARCHIVE_ROOT

dist/%.deb: build_src/VERSION dist/kolibri_archive.tar.gz
	export KOLIBRI_VERSION=$$(cat $<)
	DEB_VERSION=`echo -n "$KOLIBRI_VERSION" | sed -s 's/^\+\.\+\.\+\([abc]\|\.dev\)/\~\0/g'`
	cd kolibri-source*
	ls /dist
	uupdate --no-symlink -b -v "$DEB_VERSION" /dist/kolibri_archive.tar.gz
	cd "../kolibri-source-$DEB_VERSION"
	debuild --no-lintian -us -uc -Zgzip -z3
	cd ..
	mv *.deb dist/


.PHONY: docker-deb
docker-deb:
	mkdir -p build_src
	build_scripts/docker_build.sh

.PHONY: docker-test
docker-test:
	build_scripts/docker_test.sh
