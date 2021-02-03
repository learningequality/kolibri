# kolibri-installer-osx
Kolibri installer source for macOS

### Requirements

- Python 3.6

### Getting Started

IMPORTANT: On Windows, there is a bug with PyInstaller and the latest virutalenv.
Please downgrade your virtualenv to version 16.1.0 until the bug is fixed.

Run pip to download and install dependencies for the platform you want to target:
 
`pip install -r requirements-<platform>.txt`


Download and unpack the desired Kolibri wheel to `src/kolibri`,
then delete the `pyX.Y` subdirs in `src/kolibri/dist/cext` as
these do not contain any Mac binaries.

### Building

Running the app from source:

`pew run`

Creating a macOS app for testing in `dist/Kolibri.app`:

```
# this makes sure the modules in src/kolibri/dist are found
# despite not having been installed in the virtualenv
export PYTHONPATH=$PWD/src/kolibri/dist

# we use a wrapper around the "pew build" command for now
# to do some pre and post-processing steps
python kapew.py build
```

Creating a macOS disk image in `package` directory:

`pew package`
