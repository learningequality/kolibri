icons_dir = join_paths(datadir, 'icons', 'hicolor')

install_data(
    sources: [
        'icon-64.png',
        'icon-128.png',
        'icon-256.png',
        'icon-512.png',
    ],
    rename: [
        '64x64/apps/@0@.png'.format(application_id),
        '128x128/apps/@0@.png'.format(application_id),
        '256x256/apps/@0@.png'.format(application_id),
        '512x512/apps/@0@.png'.format(application_id),
    ],
    install_dir: icons_dir
)
