applications_dir = join_paths(datadir, 'applications')

desktop_file = configure_file(
    input: 'org.learningequality.Kolibri.desktop.in',
    output: 'org.learningequality.Kolibri.desktop',
    configuration: kolibri_gnome_config,
    install_dir: applications_dir
)

desktop_file_validate = find_program('desktop-file-validate', required: false)

if desktop_file_validate.found()
    test(
        'Validate desktop file',
        desktop_file_validate,
        args: [desktop_file]
    )
endif
