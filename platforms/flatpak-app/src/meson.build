subdir('kolibri_gnome')

configure_file(
    input: 'kolibri-gnome.in',
    output: 'kolibri-gnome',
    configuration: kolibri_gnome_config,
    install: true,
    install_dir: get_option('bindir'),
    install_mode: 'rwxr-xr-x'
)

configure_file(
    input: 'kolibri-search-provider.in',
    output: 'kolibri-search-provider',
    configuration: kolibri_gnome_config,
    install: true,
    install_dir: get_option('bindir'),
    install_mode: 'rwxr-xr-x'
)
