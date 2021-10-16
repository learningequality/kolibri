gio_dep = dependency('gio-2.0')
gio_unix_dep = dependency('gio-unix-2.0')
glib_dep = dependency('glib-2.0')
gobject_dep = dependency('gobject-2.0')

_c_config = configuration_data()
_c_config.set_quoted('DAEMON_APPLICATION_ID', daemon_application_id)
_c_config.set_quoted('DAEMON_OBJECT_PATH', daemon_object_path)
_c_config.set_quoted('DAEMON_MAIN_OBJECT_PATH', daemon_main_object_path)
_c_config.set_quoted('DAEMON_PRIVATE_OBJECT_PATH', daemon_private_object_path)
if build_profile == 'development'
    _c_config.set_quoted('PROFILE_ENV_PREFIX', 'KOLIBRI_DEVEL_')
else
    _c_config.set_quoted('PROFILE_ENV_PREFIX', 'KOLIBRI_')
endif

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

kolibri_daemon_dbus_src = gnome.gdbus_codegen(
    'kolibri-daemon-dbus',
    sources: 'org.learningequality.Kolibri.Daemon.xml',
    interface_prefix: 'org.learningequality.Kolibri.',
    namespace: 'Kolibri',
    autocleanup: 'all'
)

kolibri_daemon_dbus_utils_src = [
    'kolibri-daemon-dbus-utils.c',
    'kolibri-daemon-dbus-utils.h'
]

kolibri_daemon_dbus_lib = shared_library(
    'kolibri-daemon-dbus',
    sources: [
        kolibri_daemon_dbus_src,
        kolibri_daemon_dbus_utils_src
    ],
    dependencies: [
        _c_config_dep,
        common_dependencies
    ],
    install: true
)

kolibri_daemon_dbus_dep = declare_dependency(
    sources: [
        kolibri_daemon_dbus_src[1],
        kolibri_daemon_dbus_utils_src[1]
    ],
    dependencies: [common_dependencies],
    link_with: kolibri_daemon_dbus_lib,
    include_directories: '.',
)

kolibri_daemon_dbus_gir = gnome.generate_gir(
    kolibri_daemon_dbus_lib,
    sources: [
        kolibri_daemon_dbus_src,
        kolibri_daemon_dbus_utils_src
    ],
    namespace: 'KolibriDaemonDBus',
    identifier_prefix: 'KolibriDaemon',
    symbol_prefix: 'kolibri_daemon',
    nsversion: '1.0',
    includes: ['Gio-2.0'],
    dependencies: [common_dependencies],
    extra_args: ['--quiet', '--warn-all'],
    install: true
)
