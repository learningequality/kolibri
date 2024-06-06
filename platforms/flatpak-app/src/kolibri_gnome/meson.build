python_installation.install_sources(
    [
        'application.py',
        '__init__.py',
        'kolibri_context.py',
        'kolibri_daemon_manager.py',
        'kolibri_setup_dialog.py',
        'kolibri_webview.py',
        'kolibri_window.py',
        'main.py',
        'utils.py',
    ],
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
