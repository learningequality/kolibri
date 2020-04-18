python = import('python')
python_installation = python.find_installation('python3')

kolibri_gnome_sources = [
    'application.py',
    '__init__.py',
    'kolibri_idle_monitor.py',
    'kolibri_redirect.py',
    'kolibri_service.py',
    'main.py',
    'run_kolibri_desktop.py',
    'run_kolibri.py',
    'run_kolibri_service.py',
    'utils.py',
]

python_installation.install_sources(
    kolibri_gnome_sources,
    subdir: 'kolibri_gnome'
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
