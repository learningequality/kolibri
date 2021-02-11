# run with envvar `ARCH=64bit` to build for v8a

ifeq (${ARCH}, 64bit)
  ARM_VER=v8a
else
  ARM_VER=v7a
endif

.PHONY: p4a_android_distro
p4a_android_distro:
	python kapew.py prep-kolibri-dist --custom-whl
	python kapew.py init android ${ARCH}

ifdef P4A_RELEASE_KEYSTORE_PASSWD
pew_release_flag = --release
endif

.PHONY: kolibri.apk
# Build the debug version of the apk
kolibri.apk: p4a_android_distro
	python kapew.py build $(pew_release_flag) android ${ARCH}


# DOCKER BUILD

# Build the docker image. Should only ever need to be rebuilt if project requirements change.
# Makes dummy file
.PHONY: build_docker
build_docker: Dockerfile
	docker build -t android_kolibri .

# Run the docker image.
# TODO Would be better to just specify the file here?
run_docker: build_docker
	./scripts/rundocker.sh

softbuild: project_info.json
	pew build $(pew_release_flag) android ${ARCH}
