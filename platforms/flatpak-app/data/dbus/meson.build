dbus = dependency('dbus-1', required: false)

if get_option('dbus_session_bus_services_dir') != ''
    dbus_session_bus_services_dir = get_option('dbus_session_bus_services_dir')
elif dbus.found()
    dbus_session_bus_services_dir = dbus.get_pkgconfig_variable('session_bus_services_dir')
else
    dbus_session_bus_services_dir = join_paths(datadir, 'dbus-1', 'services')
endif

configure_file(
    input: 'org.learningequality.Kolibri.SearchProvider.service.in',
    output: 'org.learningequality.Kolibri.SearchProvider.service',
    configuration: kolibri_gnome_config,
    install_dir: dbus_session_bus_services_dir
)

configure_file(
    input: 'org.learningequality.Kolibri.service.in',
    output: 'org.learningequality.Kolibri.service',
    configuration: kolibri_gnome_config,
    install_dir: dbus_session_bus_services_dir
)
