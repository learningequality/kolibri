gio_dep = dependency('gio-2.0')
gio_unix_dep = dependency('gio-unix-2.0')
glib_dep = dependency('glib-2.0')
gobject_dep = dependency('gobject-2.0')

_c_config = configuration_data()
_c_config.set_quoted('PACKAGE_STRING', package_string)
_c_config.set_quoted('DISPATCH_URI_SCHEME', dispatch_uri_scheme)
_c_config.set_quoted('FRONTEND_APPLICATION_ID', frontend_application_id)
_c_config.set_quoted('FRONTEND_OBJECT_PATH', frontend_object_path)
_c_config.set_quoted('FRONTEND_CHANNEL_APPLICATION_ID_PREFIX', frontend_channel_application_id_prefix)
_c_config.set_quoted('LAUNCHER_APPLICATION_ID', launcher_application_id)
_c_config.set_quoted('DAEMON_APPLICATION_ID', daemon_application_id)
_c_config.set_quoted('DAEMON_MAIN_OBJECT_PATH', daemon_main_object_path)
_c_config.set_quoted('SEARCH_PROVIDER_APPLICATION_ID', search_provider_application_id)
_c_config.set_quoted('SEARCH_PROVIDER_OBJECT_PATH', search_provider_object_path)

_c_config_dep = declare_dependency(
    sources: configure_file(
        output: 'config.h',
        configuration: _c_config
    ),
    include_directories: include_directories('.')
)

common_dependencies = [
    gio_dep,
    gio_unix_dep,
    glib_dep,
    gobject_dep
]

shell_search_provider_dbus_src = gnome.gdbus_codegen(
    'shell-search-provider-dbus',
    sources: 'org.gnome.Shell.SearchProvider2.xml',
    interface_prefix: 'org.gnome.',
    autocleanup: 'all'
)

shell_search_provider_dbus_lib = static_library(
    'shell-search-provider-dbus',
    sources: shell_search_provider_dbus_src,
    dependencies: [common_dependencies]
)

shell_search_provider_dbus_dep = declare_dependency(
    sources: shell_search_provider_dbus_src[1],
    dependencies: common_dependencies,
    link_with: shell_search_provider_dbus_lib
)

executable(
    'kolibri-gnome-search-provider',
    sources: [
        'kolibri-gnome-search-provider.c',
        'kolibri-gnome-search-provider-application.c',
        'kolibri-gnome-search-provider-main.c',
        'kolibri-task-multiplexer.c',
        'kolibri-utils.c'
    ],
    dependencies: [
        _c_config_dep,
        shell_search_provider_dbus_dep,
        kolibri_daemon_dbus_dep
    ],
    install: true,
    install_dir: kolibri_app_libexecdir
)
