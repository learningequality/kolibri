.PHONY: get-deb clean-deb clean-images clean-tools clean install-dependencies

clean: clean-deb clean-images clean-tools
	@echo "Deleted all build targets"

clean-images:
	rm -rf images

clean-tools:
	rm -rf pimod

clean-deb:
	rm -rf dist
	mkdir dist

get-deb: clean-deb
# The eval and shell commands here are evaluated when the recipe is parsed, so we put the cleanup
# into a prerequisite make step, in order to ensure they happen prior to the download.
	$(eval DLFILE = $(shell wget --content-disposition -P dist/ "${deb}" 2>&1 | grep "Saving to: " | sed 's/Saving to: ‘//' | sed 's/’//'))
	$(eval DEBFILE = $(shell echo "${DLFILE}" | sed "s/\?.*//"))
	[ "${DLFILE}" = "${DEBFILE}" ] || mv "${DLFILE}" "${DEBFILE}"


images/source.img:
	wget -O images/source.zip https://downloads.raspberrypi.org/raspios_lite_armhf/images/raspios_lite_armhf-2022-01-28/2022-01-28-raspios-bullseye-armhf-lite.zip
	unzip images/source.zip -d images/
	rm images/source.zip
	mv images/2022-01-28-raspios-bullseye-armhf-lite.img images/source.img

pimod:
	git clone --depth=1 https://github.com/Nature40/pimod.git -b v0.6.0

install-dependencies:
	sudo apt-get update -y
	sudo apt-get install -y binfmt-support fdisk file kpartx qemu qemu-user-static unzip p7zip-full wget xz-utils units
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
