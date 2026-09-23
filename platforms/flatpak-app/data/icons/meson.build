icons_dir = join_paths(datadir, 'icons', 'hicolor')

hicolor_icon_source = 'org.learningequality.Kolibri.svg'
symbolic_icon_source = 'org.learningequality.Kolibri-symbolic.svg'

if build_profile == 'development'
    hicolor_icon_source = 'org.learningequality.Kolibri.Devel.svg'
endif

install_data(
    sources: [
        hicolor_icon_source,
        symbolic_icon_source,
    ],
    rename: [
        'scalable/apps/@0@.svg'.format(base_application_id),
        'scalable/apps/@0@-symbolic.svg'.format(base_application_id),
    ],
    install_dir: icons_dir
)
