python = import('python')
python_installation = python.find_installation('python3')

kolibri_gnome_sources = [
    'globals.py',
    'kolibri_globals.py',
    'kolibri_settings.py',
    '__init__.py',
]

python_installation.install_sources(
    kolibri_gnome_sources,
    subdir: 'kolibri_gnome'
)

desktop_launcher_sources = [
    'desktop_launcher/application.py',
    'desktop_launcher/__init__.py',
    'desktop_launcher/main.py',
    'desktop_launcher/utils.py',
]

python_installation.install_sources(
    desktop_launcher_sources,
    subdir: 'kolibri_gnome/desktop_launcher'
)

kolibri_service_sources = [
    'kolibri_service/application.py',
    'kolibri_service/content_extensions.py',
    'kolibri_service/__init__.py',
    'kolibri_service/kolibri_service_main.py',
    'kolibri_service/kolibri_service_monitor.py',
    'kolibri_service/kolibri_service.py',
    'kolibri_service/kolibri_service_setup.py',
    'kolibri_service/kolibri_service_stop.py',
    'kolibri_service/main.py',
    'kolibri_service/utils.py',
]

python_installation.install_sources(
    kolibri_service_sources,
    subdir: 'kolibri_gnome/kolibri_service'
)

search_provider_sources = [
    'search_provider/application.py',
    'search_provider/__init__.py',
    'search_provider/main.py',
    'search_provider/utils.py',
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
