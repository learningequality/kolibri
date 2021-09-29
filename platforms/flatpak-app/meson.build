project('kolibri-gnome', ['c'],
    meson_version: '>= 0.50.0',
)

package_string = '@0@-@1@'.format(meson.project_name(), meson.project_version())

gnome = import('gnome')
python = import('python')
i18n = import('i18n')

python_installation = python.find_installation('python3')

bindir = join_paths(get_option('prefix'), get_option('bindir'))
libexecdir = join_paths(get_option('prefix'), get_option('libexecdir'))
locale_dir = join_paths(get_option('prefix'), get_option('localedir'))
datadir = join_paths(get_option('prefix'), get_option('datadir'))

kolibri_home_template_dir = get_option('kolibri_home_template_dir')

build_profile = get_option('profile')

if build_profile == 'default'
    base_application_id = 'org.learningequality.Kolibri'
    base_object_path = '/org/learningequality/Kolibri'
elif build_profile == 'development'
    base_application_id = 'org.learningequality.Kolibri.Devel'
    base_object_path = '/org/learningequality/Kolibri/Devel'
endif

frontend_application_id = base_application_id
frontend_object_path = base_object_path

frontend_channel_application_id_prefix = base_application_id + '.channel_'

launcher_application_id = base_application_id + '.Launcher'

daemon_application_id = base_application_id + '.Daemon'
daemon_object_path = base_object_path + '/Daemon'

search_provider_application_id = base_application_id + '.SearchProvider'
search_provider_object_path = base_object_path + '/SearchProvider'

po_dir = join_paths(meson.source_root(), 'po')

kolibri_gnome_libexecdir = join_paths(libexecdir, 'kolibri-gnome')
kolibri_gnome_datadir = join_paths(datadir, 'kolibri-gnome')

kolibri_gnome_config = configuration_data()
kolibri_gnome_config.set('BINDIR', bindir)
kolibri_gnome_config.set('PYTHON', 'python3')
kolibri_gnome_config.set('PACKAGE_STRING', package_string)
kolibri_gnome_config.set('GETTEXT_PACKAGE', meson.project_name())
kolibri_gnome_config.set('LOCALE_DIR', locale_dir)
kolibri_gnome_config.set('BUILD_PROFILE', build_profile)
kolibri_gnome_config.set('KOLIBRI_GNOME_LIBEXECDIR', kolibri_gnome_libexecdir)
kolibri_gnome_config.set('KOLIBRI_GNOME_DATADIR', kolibri_gnome_datadir)
kolibri_gnome_config.set('KOLIBRI_HOME_TEMPLATE_DIR', kolibri_home_template_dir)
kolibri_gnome_config.set('BASE_APPLICATION_ID', base_application_id)
kolibri_gnome_config.set('BASE_OBJECT_PATH', base_object_path)
kolibri_gnome_config.set('FRONTEND_APPLICATION_ID', frontend_application_id)
kolibri_gnome_config.set('LAUNCHER_APPLICATION_ID', launcher_application_id)
kolibri_gnome_config.set('FRONTEND_OBJECT_PATH', frontend_object_path)
kolibri_gnome_config.set('FRONTEND_CHANNEL_APPLICATION_ID_PREFIX', frontend_channel_application_id_prefix)
kolibri_gnome_config.set('DAEMON_APPLICATION_ID', daemon_application_id)
kolibri_gnome_config.set('DAEMON_OBJECT_PATH', daemon_object_path)
kolibri_gnome_config.set('SEARCH_PROVIDER_APPLICATION_ID', search_provider_application_id)
kolibri_gnome_config.set('SEARCH_PROVIDER_OBJECT_PATH', search_provider_object_path)

subdir('data')
subdir('po')
subdir('src')

