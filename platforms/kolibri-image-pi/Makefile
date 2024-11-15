.PHONY: get-deb clean-deb clean-images clean-tools clean install-dependencies

DIST_DIR := dist

SOURCE_FILE = images/source.xz
SOURCE_URL = https://downloads.raspberrypi.com/raspios_lite_arm64/images/raspios_lite_arm64-2024-10-28/2024-10-22-raspios-bookworm-arm64-lite.img.xz

clean: clean-deb clean-images clean-tools
	@echo "Deleted all build targets"

clean-images:
	rm -rf images

clean-tools:
	rm -rf pimod

clean-deb:
	rm -rf $(DIST_DIR)
	mkdir $(DIST_DIR)

get-deb: clean-deb
# The eval and shell commands here are evaluated when the recipe is parsed, so we put the cleanup
# into a prerequisite make step, in order to ensure they happen prior to the download.
	$(eval DLFILE = $(shell wget --content-disposition -P $(DIST_DIR)/ "${deb}" 2>&1 | grep "Saving to: " | sed 's/Saving to: ‘//' | sed 's/’//'))
	$(eval DEBFILE = $(shell echo "${DLFILE}" | sed "s/\?.*//"))
	[ "${DLFILE}" = "${DEBFILE}" ] || mv "${DLFILE}" "${DEBFILE}"


images/source.img:
	@echo "Checking if $(SOURCE_FILE) exists..."
	@if [ ! -f $(SOURCE_FILE) ]; then \
		echo "$(SOURCE_FILE) not found. Downloading..."; \
		wget -O $(SOURCE_FILE) $(SOURCE_URL); \
	else \
		echo "$(SOURCE_FILE) already exists. Skipping download."; \
	fi
	unxz -c $(SOURCE_FILE) > images/source.img
	rm $(SOURCE_FILE)

pimod:
	git clone --depth=1 https://github.com/Nature40/pimod.git -b v0.6.1

install-dependencies:
	sudo apt-get update -y
	sudo apt-get install -y binfmt-support fdisk file kpartx qemu-utils qemu-user-static unzip p7zip-full wget xz-utils units
	$(MAKE) pimod

images/base.img:
	sudo pimod/pimod.sh base.Pifile

images/Kolibri.img:
	sudo pimod/pimod.sh kolibri.Pifile

images: install-dependencies
	mkdir -p images
	$(MAKE) images/source.img
	$(MAKE) images/base.img
	$(MAKE) images/Kolibri.img

zipfile: images
# Get the version based on the debian file name kolibri_<version>-Xubuntu1_all.deb
	$(eval VERSION=$(shell ls ${DIST_DIR} | grep kolibri | sed -r 's/kolibri_(.*)-[0-9]+ubuntu1_all.deb/\1/'))
# Rename the image file to include the version
	mv images/Kolibri.img images/kolibri-pi-image-$(VERSION).img
# Zip the image file
	zip -j $(DIST_DIR)/kolibri-pi-image-$(VERSION).zip images/kolibri-pi-image-$(VERSION).img
# Clean up the final image file
	rm images/kolibri-pi-image-$(VERSION).img
