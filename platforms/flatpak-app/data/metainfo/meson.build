metainfo_dir = join_paths(datadir, 'metainfo')

metainfo_file = i18n.merge_file(
    input: configure_file(
        input: 'org.learningequality.Kolibri.metainfo.xml.in.in',
        output: 'org.learningequality.Kolibri.metainfo.xml.in',
        configuration: kolibri_app_config
    ),
    output: base_application_id + '.metainfo.xml',
    type: 'xml',
    po_dir: po_dir,
    install: true,
    install_dir: metainfo_dir
)

appstreamcli = find_program('appstreamcli', required: false)

if appstreamcli.found()
    # FIXME: We have to temporarily remove the desktop ID from the metainfo
    # file, as until https://github.com/ximion/appstream/pull/522 is shipped,
    # appstreamcli won’t accept `endless` as a desktop ID.
    metainfo_file_for_validation = custom_target(
        'org.learningequality.Kolibri.Temp.metainfo.xml',
        output: 'org.learningequality.Kolibri.Temp.metainfo.xml',
        input: metainfo_file,
        command: [
            'sed',
            's|<compulsory_for_desktop>endless</compulsory_for_desktop>||g',
            '@INPUT@',
        ],
        capture: true,
    )

    test(
        'Validate metainfo file',
        appstreamcli,
        args: ['validate', '--no-net', '--explain', metainfo_file_for_validation]
    )
endif
