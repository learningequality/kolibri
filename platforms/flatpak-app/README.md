# kolibri-installer-gnome

Kolibri desktop front-end for GNOME.

### Requirements

- Python 3.6+

### Getting started

The fastest way to try the Kolibri GNOME front-end is to install the
Flatpak app from Flathub:

<a href="https://flathub.org/apps/details/org.learningequality.Kolibri">
<img
    src="https://flathub.org/assets/badges/flathub-badge-i-en.png"
    alt="Download Kolibri on Flathub"
    width="240px"
    height="80px"
/>
</a>

### Building

To build and install this project, you will need to use the
[Meson](https://meson.build) build system:

    meson . build
    ninja -C build
    ninja -C build install

The resulting software expects to have Kolibri installed on the system, with
the Kolibri launcher in _$PATH_ and Kolibri Python packages available in
_$PYTHONHOME_. We expect that an installer package will provide these
dependencies in addition to installing the desktop front-end.

It will also take advantage of having the following Kolibri plugins installed:
- [kolibri-app-desktop-xdg-plugin](https://github.com/endlessm/kolibri-app-desktop-xdg-plugin)
- [kolibri-desktop-auth-plugin](https://github.com/endlessm/kolibri-desktop-auth-plugin)

If so, they will be automatically registered before Kolibri is
initialized.

### Developer documentation

#### Setup repository

Please setup `pre-commit` as a git hook before submitting a pull
request:

```
# If you don't have pre-commit already:
pip install pre-commit

# Setup git hook:
pre-commit install
```

Now `pre-commit` will run automatically on `git commit`!

#### Using GNOME Builder

This project is ready to be built with Builder. Since this project has
multiple modules which interact through D-Bus, you will first have to
build and install a flatpak. Once the flatpak is installed, you'll be
able to develop any module.

1. Select *Clone Repository* from Builder's start dialog, or by
   opening the application menu at the right of the top bar. Fill in
   the Repository URL for this repository and click *Clone Project*.

2. Builder will attempt a build right after cloning. The next time you
   want to build, use the brick wall icon at the top bar.

3. Once the first build succeeds, click on the title in the middle of
   the top bar. It will open a panel. Click on the *Export Bundle*
   button. Once the export has successfully completed, Builder will
   open a file browser window showing the export directory, with the
   flatpak bundle already selected. Note that this file is named
   *org.learningequality.Kolibri.Devel.flatpak*, the ".Devel" allows
   parallel installation with the production flatpak.

4. Double-click the icon of the flatpak bundle file in order to
   install it. Or if you prefer a CLI output, copy the path to the
   file and use `flatpak install` from a Terminal window. The path is
   somewhere inside Builder's cache folder.

5. Now you are ready to develop. For running the front-end, just click
   on the play button at the top bar. For running any other module,
   you can change the command in the
   `build-aux/flatpak/org.learningequality.Kolibri.Devel.json` flatpak
   manifest file. Example: `{"command":
   "/app/libexec/kolibri-app/kolibri-gnome-search-provider"}`.

#### Modules

This repository includes the following modules:
- **kolibri_gnome:** A GNOME front-end for Kolibri
- **kolibri_gnome_search_provider:** A search provider for GNOME Shell
- **kolibri_daemon:** A system service to interact with Kolibri
- **kolibri_gnome_launcher:** A launcher for the frontend from desktop
  URIs
- **kolibri_app:** Common utilities used by the modules above
- **libkolibri_daemon_dbus:** Helper library for kolibri-daemon D-Bus
  interfaces

**kolibri_gnome:** Kolibri as a standalone GNOME app in a
webview. Opens channels as separate applications, each in their own
window (see kolibri_launcher). Has command line parameters to start
the webview in a specific channel or content page.

**kolibri_gnome_search_provider:** Expose Kolibri search capabilities
to GNOME Shell. The default search provider contains results for all
channels, but it is possible to group search results by their
respective channels by querying a channel-specific search provider
object. Interacts with the kolibri_daemon service to get search
results from kolibri.

**kolibri_daemon:** A D-Bus service to manage Kolibri lifecycle and
allow other modules to interact with the running Kolibri. It is possible to
run it as a system service, as opposed to a session service, using
configuration such as <https://github.com/endlessm/eos-kolibri>.
Exposes an App Key property that the frontend must use in order to
authenticate the webview.

**kolibri_launcher:** Launcher of kolibri-gnome. Understands desktop
URIs like `kolibri-channel://`, `x-kolibri-dispatch://` and converts
them into kolibri-gnome arguments. Starts kolibri-gnome with a
specific application ID depending on the URI. This is why a launcher
process is needed instead of handling these URIs in kolibri-gnome.

#### Creating releases

Before creating a release, be sure you update [org.learningequality.Kolibri.metainfo.xml.in.in](data/metainfo/org.learningequality.Kolibri.metainfo.xml.in.in)
with information about the new release, and mark it as stable.

Next, use [bump2version](<https://pypi.org/project/bump2version/>). This will
create a new git tag and update the `VERSION` file in the project root:

```
bump2version minor
git push
git push --tags
```

Note that it is possible to increment either the `major`, `minor`, or `patch`
component of the project's version number.

### Debugging and advanced usage

#### Web inspector

For development builds, kolibri-gnome enables WebKit developer extras. You can
open the web inspector by pressing F12, or by right clicking and choosing
"Inspect Element" from the context menu. If this is not available, try running
the application with `env KOLIBRI_APP_DEVELOPER_EXTRAS=1` for a production
build, or with `env KOLIBRI_DEVEL_APP_DEVELOPER_EXTRAS=1` for a development
build.

#### Automatic provisioning

The kolibri-daemon service will automatically provision Kolibri when it starts
for the first time. This skips Kolibri's first-run setup wizard and sets up
Kolibri with no root user. To disable this feature, start kolibri-daemon with
the `KOLIBRI_APP_AUTOMATIC_PROVISION` environment variable set to `0` for a
production build, or with `KOLIBRI_DEVEL_APP_AUTOMATIC_PROVISION` for a
development build. For example, using the reference flatpak:

```
env KOLIBRI_DEVEL_APP_AUTOMATIC_PROVISION=0 flatpak run --command=/app/libexec/kolibri-app/kolibri-daemon org.learningequality.Kolibri.Devel
```

Alternatively, provide your own [automatic provisioning file](httpshttps://github.com/learningequality/kolibri/blob/release-v0.16.x/kolibri/core/device/utils.py#L335-L365)
and start kolibri-daemon with `env KOLIBRI_AUTOMATIC_PROVISION_FILE=/path/to/automatic_provision.json`.

#### Automatic sign in

The kolibri-gnome application will automatically sign in to Kolibri using a
private token assigned to the current desktop user. This is necessary to
support the automatic provisioning feature. To disable automatic sign in, so
Kolibri will instead require you to sign in with a password, start the
application with the `KOLIBRI_APP_AUTOMATIC_LOGIN` environment variable set
to `0` for a production build, or with `KOLIBRI_DEVEL_APP_AUTOMATIC_LOGIN`
for a development build. For example, using the reference flatpak:

```
env KOLIBRI_DEVEL_APP_AUTOMATIC_LOGIN=0 flatpak run org.learningequality.Kolibri.Devel
```
