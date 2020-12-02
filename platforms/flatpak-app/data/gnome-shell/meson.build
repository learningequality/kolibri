gnome_shell_search_providers_dir = join_paths(datadir, 'gnome-shell', 'search-providers')

configure_file(
    input: 'org.learningequality.Kolibri.ini.in',
    output: application_id + '.ini',
    configuration: kolibri_gnome_config,
    install_dir: gnome_shell_search_providers_dir
)
