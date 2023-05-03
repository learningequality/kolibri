.ONESHELL:

DIST_DIR:=./dist

clean:
	rm -Rf dist/*

# Doesn't have to run if you bring in your own tarball.
build_src/%.tar.gz:
	mkdir -p build_src
	pip download --no-binary :all: -d build_src kolibri


dist/VERSION: build_src/*.tar.gz
	mkdir -p dist
	@# Use head of archive list to determine version location
	ARCHIVE_ROOT=$$(tar -tf $< | head -1)
	VERSION_PATH=$${ARCHIVE_ROOT}kolibri/VERSION

	tar -zxvf $< $$VERSION_PATH
	mv $$VERSION_PATH $@
	rm -rf $$ARCHIVE_ROOT


dist/%.orig.tar.gz: dist/VERSION
	$(eval RELEASE_VERSION:= $(shell cat $(DIST_DIR)/VERSION))
	cp build_src/*.tar.gz $(DIST_DIR)/kolibri-source_$(RELEASE_VERSION).orig.tar.gz


# Meant to be used for local dev. Can be called with alias below.
# If something changes in the way you build locally, please update this recipe.
dist/%.deb: dist/%.orig.tar.gz
	build_tools/build.sh

.PHONY: kolibri.deb
kolibri.deb: dist/kolibri.deb

.PHONY: kolibri.changes
kolibri.changes: dist/%.orig.tar.gz
	build_tools/build.sh -S

# Commit to kolibri-installer-debian the new release changelog
# and upload the package to PPA
# Both gpg key and git credentials must be set up for this to work
.PHONY: commit-new-release
commit-new-release: kolibri.changes
	find dist -name *.changes -exec dput --unchecked ppa:learningequality/kolibri-proposed {} \;
	# find dist -name changelog -exec cp {} debian \;
	# git commit -a -m "New release: $(shell cat dist/VERSION)"
	# git push

.PHONY:
clean-tar:
	rm -rf build_src
	mkdir build_src

.PHONY: get-tar
get-tar: clean-tar
# The eval and shell commands here are evaluated when the recipe is parsed, so we put the cleanup
# into a prerequisite make step, in order to ensure they happen prior to the download.
	$(eval DLFILE = $(shell wget --content-disposition -P build_src/ "${tar}" 2>&1 | grep "Saving to: " | sed 's/Saving to: ‘//' | sed 's/’//'))
	$(eval TARFILE = $(shell echo "${DLFILE}" | sed "s/\?.*//"))
	[ "${DLFILE}" = "${TARFILE}" ] || mv "${DLFILE}" "${TARFILE}"
