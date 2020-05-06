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

# Meant to be used for local dev. Can be called with alias below.
# If something changes in the way you build locally, please update this recipe.
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

.PHONY: kolibri.deb
kolibri.deb: dist/kolibri.deb

.PHONY: docker-deb
docker-deb:
	# Essentially just calls make dist/%.deb in a prepared docker container.
	# After building, it copies the .deb into the dist/ dir.
	build_tools/docker_build.sh

# Docker images in which tests will run.
# Can override this variable locally with make, or by exporting prior to calling
# the script directly.
DOCKER_IMAGES="\
  ubuntu:focal \
  ubuntu:bionic \
  ubuntu:xenial \
  ubuntu:trusty \
"
.PHONY: docker-test
docker-test:
	export DOCKER_IMAGES=$(DOCKER_IMAGES) && build_tools/docker_test.sh
