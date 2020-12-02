dbus_session_bus_services_dir = join_paths(datadir, 'dbus-1', 'services')

configure_file(
    input: 'org.learningequality.Kolibri.SearchProvider.service.in',
    output: application_id + '.SearchProvider.service',
    configuration: kolibri_gnome_config,
    install_dir: dbus_session_bus_services_dir
)

configure_file(
    input: 'org.learningequality.Kolibri.service.in',
    output: application_id + '.service',
    configuration: kolibri_gnome_config,
    install_dir: dbus_session_bus_services_dir
)
