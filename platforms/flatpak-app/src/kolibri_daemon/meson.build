python_installation.install_sources(
    [
        'application.py',
        'content_extensions.py',
        'content_extensions_manager.py',
        'dbus_helpers.py',
        'desktop_users.py',
        'futures.py',
        'glib_helpers.py',
        '__init__.py',
        'kolibri_app_interface.py',
        'kolibri_http_process.py',
        'kolibri_search_handler.py',
        'kolibri_service_context.py',
        'kolibri_service_manager.py',
        'kolibri_utils.py',
        'main.py',
    ],
    subdir: 'kolibri_daemon'
)

configure_file(
    input: 'kolibri-daemon.in',
    output: 'kolibri-daemon',
    configuration: kolibri_app_config,
    install: true,
    install_dir: kolibri_app_libexecdir,
    install_mode: 'rwxr-xr-x'
)
