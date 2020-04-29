project('kolibri-gnome',
    meson_version: '>= 0.50.0',
)

i18n = import('i18n')

bindir = join_paths(get_option('prefix'), get_option('bindir'))
libexecdir = join_paths(get_option('prefix'), get_option('libexecdir'))
locale_dir = join_paths(get_option('prefix'), get_option('localedir'))
datadir = join_paths(get_option('prefix'), get_option('datadir'))

po_dir = join_paths(meson.source_root(), 'po')

kolibri_gnome_libexecdir = join_paths(libexecdir, 'kolibri-gnome')
kolibri_gnome_datadir = join_paths(datadir, 'kolibri-gnome')

kolibri_gnome_config = configuration_data()
kolibri_gnome_config.set('BINDIR', bindir)
kolibri_gnome_config.set('PYTHON', 'python3')
kolibri_gnome_config.set('GETTEXT_PACKAGE', meson.project_name())
kolibri_gnome_config.set('LOCALE_DIR', locale_dir)
kolibri_gnome_config.set('KOLIBRI_GNOME_LIBEXECDIR', kolibri_gnome_libexecdir)
kolibri_gnome_config.set('KOLIBRI_GNOME_DATADIR', kolibri_gnome_datadir)

subdir('data')
subdir('po')
subdir('src')

