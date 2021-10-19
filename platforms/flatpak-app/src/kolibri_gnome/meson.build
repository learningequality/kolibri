kolibri_gnome_sources = [
    'application.py',
    '__init__.py',
    'kolibri_daemon_manager.py',
    'main.py',
    'utils.py',
]

python_installation.install_sources(
    kolibri_gnome_sources,
    subdir: 'kolibri_gnome'
)

configure_file(
    input: 'kolibri-gnome.in',
    output: 'kolibri-gnome',
    configuration: kolibri_app_config,
    install: true,
    install_dir: bindir,
    install_mode: 'rwxr-xr-x'
)
