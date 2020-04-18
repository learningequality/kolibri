# kolibri-installer-gnome

Kolibri desktop front-end for GNOME.

### Requirements

- Python 3.6

### Getting started

### Building

To build and install this project, you will need to use the
[Meson](https://meson.build) build system:

    meson . build
    ninja -C build
    ninja -C build install

The resulting software expects to have Kolibri installed on the system, with
the Kolibri launcher in the _$PATH_ and Kolibri Python packages available in
_$PYTHONHOME_. import. We expect that an installer package will provide these
dependencies in addition to installing the desktop front-end.

