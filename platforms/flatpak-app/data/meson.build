subdir('applications')
subdir('dbus')
subdir('gnome-shell')
subdir('icons')
subdir('kolibri-gnome')
subdir('media-icons')
subdir('metainfo')

gresource_file = configure_file(
    input: 'org.learningequality.Kolibri.gresource.xml.in',
    output: base_application_id + '.gresource.xml',
    configuration: kolibri_app_config
)

gnome.compile_resources(
    'kolibri-app',
    gresource_file,
    source_dir: meson.current_build_dir(),
    dependencies: metainfo_file,
    gresource_bundle: true,
    install: true,
    install_dir: kolibri_app_data_dir
)
