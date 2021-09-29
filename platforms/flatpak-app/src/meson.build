subdir('kolibri_gnome')
subdir('kolibri_gnome_search_provider')

configure_file(
    input: 'kolibri-gnome.in',
    output: 'kolibri-gnome',
    configuration: kolibri_gnome_config,
    install: true,
    install_dir: bindir,
    install_mode: 'rwxr-xr-x'
)

configure_file(
    input: 'kolibri-launcher.in',
    output: 'kolibri-launcher',
    configuration: kolibri_gnome_config,
    install: true,
    install_dir: bindir,
    install_mode: 'rwxr-xr-x'
)

configure_file(
    input: 'kolibri-daemon.in',
    output: 'kolibri-daemon',
    configuration: kolibri_gnome_config,
    install: true,
    install_dir: kolibri_gnome_libexecdir,
    install_mode: 'rwxr-xr-x'
)

configure_file(
    input: 'kolibri-search-provider.in',
    output: 'kolibri-search-provider',
    configuration: kolibri_gnome_config,
    install: true,
    install_dir: kolibri_gnome_libexecdir,
    install_mode: 'rwxr-xr-x'
)
