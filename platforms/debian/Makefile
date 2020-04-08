.ONESHELL:

clean:
	rm dist/*
	rm src/*VERSION

src/*.tar.gz:
	scripts/get_tarball.sh

# Need a reliable name so `make` knows what to look for.
# Copying rather than renaming in place so that users
# can plop their own tarball in `src` if so desired.

dist/kolibri_archive.tar.gz: src/*.tar.gz
	@# Copy to dist, where it will be copied to container
	mkdir -p dist
	cp $< $@

src/VERSION: dist/kolibri_archive.tar.gz
	@# Use head of archive list to determine version location
	ARCHIVE_ROOT=$$(tar -tf $< | head -1)
	VERSION_PATH=$${ARCHIVE_ROOT}kolibri/VERSION

	tar -zxvf $< $$VERSION_PATH
	mv $$VERSION_PATH $@
	rm -r $$ARCHIVE_ROOT

.PHONY: docker-deb
docker-deb: src/VERSION dist/kolibri_archive.tar.gz
	docker image build -t "learningequality/kolibri-deb" .
	export KOLIBRI_VERSION=$$(cat $<)
	docker run --env KOLIBRI_VERSION -v $$PWD/dist:/kolibridist "learningequality/kolibri-deb"
