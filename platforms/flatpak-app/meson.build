project('kolibri-gnome', ['c'],
    meson_version: '>= 0.56.0',
    version: '2.3.3'
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
    profile_env_prefix = 'KOLIBRI_'
elif build_profile == 'development'
    base_application_id = 'org.learningequality.Kolibri.Devel'
    base_object_path = '/org/learningequality/Kolibri/Devel'
    profile_env_prefix = 'KOLIBRI_DEVEL_'
endif

frontend_application_id = base_application_id
frontend_object_path = base_object_path

frontend_channel_application_id_prefix = base_application_id + '.channel_'

launcher_application_id = base_application_id + '.Launcher'

daemon_application_id = base_application_id + '.Daemon'
daemon_object_path = base_object_path + '/Daemon'
daemon_main_object_path = daemon_object_path + '/Main'
daemon_private_object_path = daemon_object_path + '/Private'

search_provider_application_id = base_application_id + '.SearchProvider'
search_provider_object_path = base_object_path + '/SearchProvider'

po_dir = join_paths(meson.project_source_root(), 'po')

kolibri_app_libexecdir = join_paths(libexecdir, 'kolibri-app')
kolibri_app_datadir = join_paths(datadir, 'kolibri-app')

kolibri_app_config = configuration_data()
kolibri_app_config.set('BINDIR', bindir)
kolibri_app_config.set('PYTHON', 'python3')
kolibri_app_config.set('PACKAGE_STRING', package_string)
kolibri_app_config.set('PROJECT_VERSION', meson.project_version())
kolibri_app_config.set('GETTEXT_PACKAGE', meson.project_name())
kolibri_app_config.set('LOCALE_DIR', locale_dir)
kolibri_app_config.set('BUILD_PROFILE', build_profile)
kolibri_app_config.set('PROFILE_ENV_PREFIX', profile_env_prefix)
kolibri_app_config.set('KOLIBRI_APP_LIBEXECDIR', kolibri_app_libexecdir)
kolibri_app_config.set('KOLIBRI_APP_DATADIR', kolibri_app_datadir)
kolibri_app_config.set('KOLIBRI_HOME_TEMPLATE_DIR', kolibri_home_template_dir)
kolibri_app_config.set('BASE_APPLICATION_ID', base_application_id)
kolibri_app_config.set('BASE_OBJECT_PATH', base_object_path)
kolibri_app_config.set('FRONTEND_APPLICATION_ID', frontend_application_id)
kolibri_app_config.set('LAUNCHER_APPLICATION_ID', launcher_application_id)
kolibri_app_config.set('FRONTEND_OBJECT_PATH', frontend_object_path)
kolibri_app_config.set('FRONTEND_CHANNEL_APPLICATION_ID_PREFIX', frontend_channel_application_id_prefix)
kolibri_app_config.set('DAEMON_APPLICATION_ID', daemon_application_id)
kolibri_app_config.set('DAEMON_OBJECT_PATH', daemon_object_path)
kolibri_app_config.set('DAEMON_MAIN_OBJECT_PATH', daemon_main_object_path)
kolibri_app_config.set('DAEMON_PRIVATE_OBJECT_PATH', daemon_private_object_path)
kolibri_app_config.set('SEARCH_PROVIDER_APPLICATION_ID', search_provider_application_id)
kolibri_app_config.set('SEARCH_PROVIDER_OBJECT_PATH', search_provider_object_path)

subdir('data')
subdir('po')
subdir('src')

subdir('tests')
