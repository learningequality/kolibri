dbus_session_bus_services_dir = join_paths(datadir, 'dbus-1', 'services')

configure_file(
    input: 'org.learningequality.Kolibri.Daemon.service.in',
    output: daemon_application_id + '.service',
    configuration: kolibri_gnome_config,
    install_dir: dbus_session_bus_services_dir
)

configure_file(
    input: 'org.learningequality.Kolibri.Frontend.service.in',
    output: frontend_application_id + '.service',
    configuration: kolibri_gnome_config,
    install_dir: dbus_session_bus_services_dir
)

configure_file(
    input: 'org.learningequality.Kolibri.SearchProvider.service.in',
    output: search_provider_application_id + '.service',
    configuration: kolibri_gnome_config,
    install_dir: dbus_session_bus_services_dir
)
