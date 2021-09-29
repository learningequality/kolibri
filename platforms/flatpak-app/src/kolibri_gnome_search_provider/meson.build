gio_dep = dependency('gio-2.0')
gio_unix_dep = dependency('gio-unix-2.0')
glib_dep = dependency('glib-2.0')
gobject_dep = dependency('gobject-2.0')

search_provider_config = configuration_data()
search_provider_config.set_quoted('PACKAGE_STRING', package_string)
search_provider_config.set_quoted('FRONTEND_APPLICATION_ID', frontend_application_id)
search_provider_config.set_quoted('FRONTEND_OBJECT_PATH', frontend_object_path)
search_provider_config.set_quoted('FRONTEND_CHANNEL_APPLICATION_ID_PREFIX', frontend_channel_application_id_prefix)
search_provider_config.set_quoted('LAUNCHER_APPLICATION_ID', launcher_application_id)
search_provider_config.set_quoted('DAEMON_APPLICATION_ID', daemon_application_id)
search_provider_config.set_quoted('DAEMON_OBJECT_PATH', daemon_object_path)
search_provider_config.set_quoted('SEARCH_PROVIDER_APPLICATION_ID', search_provider_application_id)
search_provider_config.set_quoted('SEARCH_PROVIDER_OBJECT_PATH', search_provider_object_path)

config_dep = declare_dependency(
    sources: configure_file(
        output: 'config.h',
        configuration: search_provider_config
    ),
    include_directories: include_directories('.')
)

common_dependencies = [
    gio_dep,
    gio_unix_dep,
    glib_dep,
    gobject_dep
]

shell_search_provider_dbus_dep = declare_dependency(
    sources: gnome.gdbus_codegen(
        'shell-search-provider-dbus',
        sources: 'org.gnome.Shell.SearchProvider2.xml',
        interface_prefix: 'org.gnome.'
    ),
    dependencies: common_dependencies,
    include_directories: include_directories('.')
)

kolibri_daemon_dbus_dep = declare_dependency(
    sources: gnome.gdbus_codegen(
        'kolibri-daemon-dbus',
        sources: 'org.learningequality.Kolibri.Daemon.xml',
        interface_prefix: 'org.learningequality.'
    ),
    dependencies: common_dependencies,
    include_directories: include_directories('.')
)

search_provider_dependencies = [
    config_dep,
    shell_search_provider_dbus_dep,
    kolibri_daemon_dbus_dep,
    common_dependencies
]

executable(
    'kolibri-gnome-search-provider',
    sources: [
        'kolibri-gnome-search-provider.c',
        'kolibri-gnome-search-provider-application.c',
        'kolibri-gnome-search-provider-main.c',
        'kolibri-task-multiplexer.c',
        'kolibri-utils.c'
    ],
    dependencies: search_provider_dependencies,
    install: true,
    install_dir: kolibri_gnome_libexecdir
)

