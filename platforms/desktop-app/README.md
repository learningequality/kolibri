# Kolibri WX PyInstaller App
Cross-platform Kolibri app

### Requirements

- Python 3.9

### Supported Platforms

- Linux
- macOS
- Windows

## Getting Started

**Windows Note:** On Windows, there is a bug with PyInstaller and the latest virtualenv.
If you're using virtualenv, please downgrade your virtualenv to version 16.1.0 until
the bug is fixed.

**Mac Note:** Make sure you are using the
[python.org Mac installer](https://www.python.org/ftp/python/3.6.8/python-3.6.8-macosx10.9.pkg)
to install the package. Using pyenv, homebrew, etc. **will not work**. This is
because they are configured differently from python.org builds.

Run pip to download and install dependencies for the platform you want to target:

`pip install .`

Builds must be run natively on the platform you're targeting.

### Downloading a Kolibri build

Run `make get-whl <whl_url>`.

### Building and running the app

Once you have downloaded and installed the Kolibri whl file, run `make pyinstaller` to build the app.

#### Running the app from source

`python -m kolibri_app`

#### Creating a native app for testing

`make pyinstaller`

Outputs appear in the `dist` folder.

#### Exporting a p12 certificate for codesigning
To export the necessary p12 certificate used for codesigning, first be sure to have the certificate from developer.apple.com in your keychain. The certificate should be something like Developer ID Application: Foundation for Learning Equality ([ID of numbers and letters]). If you need to request the certificate to add to your keychain, follow [the instructions provided by Apple here](https://support.apple.com/guide/keychain-access/request-a-certificate-authority-kyca2793/mac).

Then, be sure that the certificate is valid (selecting it will show a checkmark and say that it is valid), and that it has an associated private key. You can check if there is a private key in keychain access. Next to the name on the left, there should be a toggle, which would open to show that there is a private key, associated with your name. This is the bundle that is able to be exported. Using a certificate without this associated private key will NOT work.

Once you have confirmed that the private key is linked with the certificate, right click, Export, and then select p12 as the file option. If there is no p12 as an option, your certificate does not have the private key.

Choose a password that will be associate with the certificate, and enter when prompted (also, write it down because you will not access it again). Add the password and the file in 1Password for team access.


#### Creating a signed build

`make codesign-mac`

You will need to set the proper credentials for signing via environment variables.
The script will explain what environment variables you need to set if they aren't set.

On Mac, after this process, you need to wait for an email from Apple explaining that
the build was successfully verified. Then, run the following command, which adds Apple's
verification to the app so that it can be recognized when run offline:

`xcrun stapler staple dist/Kolibri.app`

Make sure these steps are performed before packaging the build.

#### Creating an app installer package

`make build-dmg`
