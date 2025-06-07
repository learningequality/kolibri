# Kolibri WX PyInstaller App
Cross-platform Kolibri app

### Requirements
- **Python**: Version 3.10 is required.

- **`wget`:** Required for downloading the Kolibri wheel.
    - **Windows:** If `wget` is not available in your Git Bash environment, you can download it from [eternallybored.org's builds](https://eternallybored.org/misc/wget/).

### Supported Platforms

- Linux
- macOS
- Windows (Git Bash)


**Windows Note:** On Windows, there is a bug with PyInstaller and the latest virtualenv.
If you're using virtualenv, please downgrade your virtualenv to version 16.1.0 until
the bug is fixed.

**Mac Note:** Make sure you are using the
[python.org Mac installer](https://www.python.org/ftp/python/3.6.8/python-3.6.8-macosx10.9.pkg)
to install the package. Using pyenv, homebrew, etc. **will not work**. This is
because they are configured differently from python.org builds.

**Note:** Builds must be run natively on the platform you're targeting.


## Development Environment Setup

- **Clone the Repository:**
  ```
  git clone https://github.com/learningequality/kolibri-app.git
  cd kolibri-app
  ```

- **Install Build Dependencies:**
This step installs PyInstaller, pkginfo, and other Python packages required by the build process:
  ```
  make dependencies
  ```

- **Install Local Application Package (Optional):**
If you plan to make changes to the kolibri-app wrapper code itself and want it recognized as an installed package in your environment, you can run:
  ```
  pip install -e .
  ```


## Build the Application
The general workflow is to fetch a specific Kolibri Python wheel (`.whl`) and then use PyInstaller to package it.

- **Fetch and Prepare the Kolibri Wheel:**
You'll need the URL of the Kolibri `.whl` file for the version you intend to package. You can find release URLs on the [Kolibri GitHub Releases page](https://github.com/learningequality/kolibri/releases).
  ```
  make get-whl whl="<URL_TO_KOLIBRI_WHL_FILE>"
  ```
  **Example:**
  ```
  make get-whl whl="https://github.com/learningequality/kolibri/releases/download/v0.18.0/kolibri-0.18.0-py2.py3-none-any.whl"
  ```
  This command will:
  *   Download the wheel into the `whl/` directory.
  *   Extract and install the wheel's contents into `kolibrisrc/`.
  *   Run post-installation tasks, including generating localized loading pages into `src/kolibri_app/assets/`.

- **Build the Unpackaged Desktop Application:**
This uses PyInstaller to create an executable application bundle.
  ```
  make pyinstaller
  ```
The output will be located in the `dist/` directory.


## Running from Source (for Development)
After fetching and preparing the Kolibri wheel (Step 1 in "Building the Application"), you can run the application directly from your local source code for development and testing of the `kolibri-app` wrapper:
```
make run-dev
```
This uses the Kolibri library from `kolibrisrc/` and the `kolibri-app` code and assets from your `src/` directory.


## Exporting a p12 certificate for codesigning
To export the necessary p12 certificate used for codesigning, first be sure to have the certificate from developer.apple.com in your keychain. The certificate should be something like Developer ID Application: Foundation for Learning Equality ([ID of numbers and letters]). If you need to request the certificate to add to your keychain, follow [the instructions provided by Apple here](https://support.apple.com/guide/keychain-access/request-a-certificate-authority-kyca2793/mac).

Then, be sure that the certificate is valid (selecting it will show a checkmark and say that it is valid), and that it has an associated private key. You can check if there is a private key in keychain access. Next to the name on the left, there should be a toggle, which would open to show that there is a private key, associated with your name. This is the bundle that is able to be exported. Using a certificate without this associated private key will NOT work.

Once you have confirmed that the private key is linked with the certificate, right click, Export, and then select p12 as the file option. If there is no p12 as an option, your certificate does not have the private key.

Choose a password that will be associate with the certificate, and enter when prompted (also, write it down because you will not access it again). Add the password and the file in 1Password for team access.


## Creating a signed build

`make codesign-mac`

You will need to set the proper credentials for signing via environment variables.
The script will explain what environment variables you need to set if they aren't set.

On Mac, after this process, you need to wait for an email from Apple explaining that
the build was successfully verified. Then, run the following command, which adds Apple's
verification to the app so that it can be recognized when run offline:

`xcrun stapler staple dist/Kolibri.app`

Make sure these steps are performed before packaging the build.

## Creating an app installer package

`make build-dmg`
