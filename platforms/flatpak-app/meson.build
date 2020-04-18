project('kolibri-gnome',
  meson_version: '>= 0.50.0',
)

bindir = join_paths(get_option('prefix'), get_option('bindir'))
datadir = join_paths(get_option('prefix'), get_option('datadir'))

kolibri_gnome_datadir = join_paths(datadir, 'kolibri-gnome')


kolibri_gnome_config = configuration_data()
kolibri_gnome_config.set('bindir', bindir)
kolibri_gnome_config.set('PYTHON', 'python3')
kolibri_gnome_config.set('KOLIBRI_GNOME_DATADIR', kolibri_gnome_datadir)

subdir('data')
subdir('src')
