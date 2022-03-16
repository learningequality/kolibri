python_installation.install_sources(
    [
        'application.py',
        'dbus_helpers.py',
        'desktop_users.py',
        'futures.py',
        'glib_helpers.py',
        '__init__.py',
        'kolibri_search_handler.py',
        'kolibri_service_manager.py',
        'kolibri_utils.py',
        'main.py',
    ],
    subdir: 'kolibri_daemon'
)

python_installation.install_sources(
    [
        'kolibri_service/content_extensions.py',
        'kolibri_service/context.py',
        'kolibri_service/django_process.py',
        'kolibri_service/__init__.py',
        'kolibri_service_manager.py',
        'kolibri_service/setup_process.py',
        'kolibri_service/stop_process.py',
    ],
    subdir: 'kolibri_daemon/kolibri_service'
)

configure_file(
    input: 'kolibri-daemon.in',
    output: 'kolibri-daemon',
    configuration: kolibri_app_config,
    install: true,
    install_dir: kolibri_app_libexecdir,
    install_mode: 'rwxr-xr-x'
)
