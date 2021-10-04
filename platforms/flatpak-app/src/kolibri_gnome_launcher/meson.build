kolibri_gnome_launcher_sources = [
    '__init__.py',
    'application.py',
    'main.py',
]

python_installation.install_sources(
    kolibri_gnome_launcher_sources,
    subdir: 'kolibri_gnome_launcher'
)

configure_file(
    input: 'kolibri-gnome-launcher.in',
    output: 'kolibri-gnome-launcher',
    configuration: kolibri_app_config,
    install: true,
    install_dir: kolibri_app_libexecdir,
    install_mode: 'rwxr-xr-x'
)
