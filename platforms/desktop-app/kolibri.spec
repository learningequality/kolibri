# -*- mode: python ; coding: utf-8 -*-
import os
import sys

from datetime import datetime
from glob import glob


block_cipher = None

sys.path = [os.path.abspath('kolibrisrc')] + sys.path

import kolibri
kolibri_version = kolibri.__version__


import kolibri_app
app_version = kolibri_app.__version__

name = "Kolibri-{}-{}".format(kolibri_version, app_version)

locale_datas = [
    (mo_file, os.path.sep.join(os.path.dirname(mo_file).split(os.path.sep)[1:]))
    for mo_file in glob('src/kolibri_app/locales/**/LC_MESSAGES/*.mo')
]

a = Analysis(
    [os.path.join('src', 'kolibri_app', '__main__.py')],
    pathex=['kolibrisrc', os.path.join('kolibrisrc', 'kolibri', 'dist')],
    binaries=[],
    datas=[('src/kolibri_app/assets', 'kolibri_app/assets')] + locale_datas,
    hiddenimports=[],
    hookspath=['hooks'],
    runtime_hooks=['hooks/pyi_rth_kolibri.py'],
    excludes=['numpy', 'six.moves.urllib.parse', 'PIL'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False
)

pyz = PYZ(
    a.pure,
    a.zipped_data,
    cipher=block_cipher
)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name=name,
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch="universal2",
    codesign_identity=os.environ.get("MAC_CODESIGN_ID"),
    entitlements_file="build_config/entitlements.plist",
    console=False,
    icon='icons/kolibri.ico'
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name=name
)

if sys.platform == 'darwin':

    app = BUNDLE(
        coll,
        name="Kolibri.app",
        icon="icons/kolibri.icns",
        bundle_identifier="org.learningequality.Kolibri",
        version=kolibri_version,
        info_plist={
            'NSPrincipalClass': 'NSApplication',
            'NSAppleScriptEnabled': False,
            'CFBundleDocumentTypes': [],
            'NSAppTransportSecurity': {
                'NSAllowsArbitraryLoads': True,
                'NSExceptionDomains': {
                    'localhost': {
                        'NSExceptionAllowsInsecureHTTPLoads': True
                    }
                },
                "CFBundleVersion": app_version,
            },
        }
    )
