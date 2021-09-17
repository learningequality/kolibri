kolibri_gnome_sources = [
    'dbus_utils.py',
    'globals.py',
    '__init__.py',
    'kolibri_daemon_proxy.py',
    'kolibri_settings.py',
]

python_installation.install_sources(
    kolibri_gnome_sources,
    subdir: 'kolibri_gnome'
)

desktop_sources = [
    'desktop/application.py',
    'desktop/__init__.py',
    'desktop/main.py',
    'desktop/utils.py',
]

launcher_sources = [
    'launcher/__init__.py',
    'launcher/application.py',
    'launcher/main.py',
]

python_installation.install_sources(
    desktop_sources,
    subdir: 'kolibri_gnome/desktop'
)

python_installation.install_sources(
    launcher_sources,
    subdir: 'kolibri_gnome/launcher'
)

kolibri_daemon_sources = [
    'kolibri_daemon/application.py',
    'kolibri_daemon/content_extensions.py',
    'kolibri_daemon/__init__.py',
    'kolibri_daemon/kolibri_search_handler.py',
    'kolibri_daemon/kolibri_service_main.py',
    'kolibri_daemon/kolibri_service.py',
    'kolibri_daemon/kolibri_service_setup.py',
    'kolibri_daemon/kolibri_service_stop.py',
    'kolibri_daemon/main.py',
    'kolibri_daemon/utils.py',
]

python_installation.install_sources(
    kolibri_daemon_sources,
    subdir: 'kolibri_gnome/kolibri_daemon'
)

configure_file(
    input : 'config.py.in',
    output : 'config.py',
    configuration : kolibri_gnome_config,
    install_dir : join_paths(
        python_installation.get_install_dir(
            subdir: 'kolibri_gnome',
            pure: false
        )
    )
)
