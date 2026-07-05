# Kolibri Raspberry Pi image

## Using Kolibri Rasbperry Pi image

1. Download the zip file from the releases page
2. Use any of the method explained at https://www.raspberrypi.org/documentation/installation/installing-images/README.md to write the image to a SD card (If using Linux, `unzip -p image_2019-12-01-Kolibri-lite.zip| dd of=/dev/sdb bs=4M conv=fsync` is the fastest method, supposing your SD card is in `/dev/sdb`)
3. Insert the SD card in the Raspberry PI
4. Power on the Rasperry Pi and wait ( The process takes less than 5 minutes in a model 4. Depending on the model it can take longer)
5. Enjoy it!

After following the above steps the Raspberry Pi will provide a wifi network named under the essid `kolibri` without any password.

After connecting a device to this wifi network provided by the Raspberry, you can open the url http://10.10.10.10 in a browser will allow you enjoy all the features of a working Kolibri server.

By default the server does not have Internet access. To add content channels to Kolibri you can either connect an usb disk with content or plug and ethernet cable with Internet access.

In case you want to login into the server, the user is `pi` and the password is `kolibrifly`

**VERY IMPORTANT NOTICE**: After installing the image, a ssh server is installed with a known password. **CHANGE IT** in case you want to connect it to Internet or be used by people who could mess it up.


### Good to know:
- The installed system contains a fully Raspbian image, with all the software included in the `lite` version from https://www.raspberrypi.org/downloads/raspbian/ . After login `sudo raspi-config` can be used to customize its environment, including localization, timezone, etc. if desired.
- If an ethernet cable with Internet access is connected to the Raspberry, it will have Internet connectivity but *won't* provide this connectivity to the devices that are connected to its `kolibri` essid. These devices will only be able to use the browser with the kolibri application at the http://10.10.10.10 url.

## Building the Kolibri Raspberry Pi image

To build the image locally, you must be working on a Debian based Linux distribution.

Download a specific Kolibri Debian installer using `make get-deb deb=<url>`, this will put it into a `dist` folder in the repository. If you want to bring in a Debian installer by other means, you can just copy it into the `dist` folder instead.

Simply running `make images` should be enough to create the image. Note that building the actual images requires sudo access, so you may be prompted to enter your administrator password.

To clean up all built assets, use `make clean` - but be aware that this will remove everything except installed Debian requirements.

After installing dependencies, the build consists of three main steps:

1. Downloading a source image from raspberrypi.org - this gets put into `images/source.img`.

2. Creating a base image that does not include Kolibri - this gets put into `images/base.img`.

3. Creating the Kolibri image including the Debian installer in `dist` and the latest version of kolibri-server - this gets put into `images/Kolibri.img`.

To incrementally rebuild, you could remove the Kolibri image file to just rebuild that file, or both the base and Kolibri image files to rebuild both the next time you run `make images`.

The base and Kolibri images are specified using `base.Pifile` and `kolibri.Pifile` for more information about the specification of these files, see the [pimod documentation](https://github.com/Nature40/pimod).
