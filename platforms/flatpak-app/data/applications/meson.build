applications_dir = join_paths(datadir, 'applications')

desktop_file = i18n.merge_file(
    input: configure_file(
        input: 'org.learningequality.Kolibri.desktop.in.in',
        output: 'org.learningequality.Kolibri.desktop.in',
        configuration: kolibri_gnome_config
    ),
    output: application_id + '.desktop',
    type: 'desktop',
    po_dir: po_dir,
    install: true,
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
