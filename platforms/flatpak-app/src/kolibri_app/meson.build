python_installation.install_sources(
    [
        'globals.py',
        '__init__.py',
        'kolibri_settings.py',
        'utils.py',
    ],
    subdir: 'kolibri_app'
)

configure_file(
    input: 'config.py.in',
    output: 'config.py',
    configuration: kolibri_app_config,
    install_dir: join_paths(
        python_installation.get_install_dir(
            subdir: 'kolibri_app',
            pure: false
        )
    )
)

# Copy all files from the source directory to the build directory. This is
# required to run unit tests without against the build and source directories.

configure_file(
    input: 'globals.py',
    output: 'globals.py',
    copy: true
)

configure_file(
    input: '__init__.py',
    output: '__init__.py',
    copy: true
)

configure_file(
    input: 'kolibri_settings.py',
    output: 'kolibri_settings.py',
    copy: true
)

configure_file(
    input: 'utils.py',
    output: 'utils.py',
    copy: true
)
