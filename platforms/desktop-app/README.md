# kolibri-installer-osx
Kolibri installer source for macOS

### Requirements

- Python 3.6
- pipenv

### Getting Started

Run pipenv to download and install dependencies:
 
`pipenv sync --dev`

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

pew build
```

Creating a macOS disk image in `package` directory:

`pew package`
