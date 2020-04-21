python = import('python')
python_installation = python.find_installation('python3')

kolibri_gnome_sources = [
    'run_kolibri.py',
    'utils.py',
    '__init__.py',
    'run_kolibri_desktop.py',
    'run_kolibri_service.py',
]

python_installation.install_sources(
    kolibri_gnome_sources,
    subdir: 'kolibri_gnome'
)

desktop_launcher_sources = [
    'desktop_launcher/kolibri_service.py',
    'desktop_launcher/__init__.py',
    'desktop_launcher/application.py',
    'desktop_launcher/kolibri_redirect.py',
    'desktop_launcher/kolibri_idle_monitor.py',
    'desktop_launcher/main.py',
    'desktop_launcher/service_utils.py',
]

python_installation.install_sources(
    desktop_launcher_sources,
    subdir: 'kolibri_gnome/desktop_launcher'
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
