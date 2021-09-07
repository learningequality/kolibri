python = import('python')
python_installation = python.find_installation('python3')

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

desktop_launcher_sources = [
    'desktop_launcher/application.py',
    'desktop_launcher/__init__.py',
    'desktop_launcher/main.py',
    'desktop_launcher/channel.py',
    'desktop_launcher/utils.py',
]

python_installation.install_sources(
    desktop_launcher_sources,
    subdir: 'kolibri_gnome/desktop_launcher'
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

search_provider_sources = [
    'search_provider/application.py',
    'search_provider/__init__.py',
    'search_provider/main.py',
]

python_installation.install_sources(
    search_provider_sources,
    subdir: 'kolibri_gnome/search_provider'
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
