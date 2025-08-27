# -*- mode: python ; coding: utf-8 -*-
import os
import sys
import wx

from datetime import datetime
from glob import glob
from importlib.metadata import entry_points


block_cipher = None

sys.path = [os.path.abspath('kolibrisrc')] + sys.path

import kolibri
kolibri_version = kolibri.__version__

name = "Kolibri-{}".format(kolibri_version)

locale_datas = [
    (mo_file, os.path.sep.join(os.path.dirname(mo_file).split(os.path.sep)[1:]))
    for mo_file in glob('src/kolibri_app/locales/**/LC_MESSAGES/*.mo')
]

entry_point_packages = dict()

# List of packages that should have there Distutils entrypoints included.
ep_packages = ["kolibri.plugins"]

for ep_package in ep_packages:
    packages = []
    for ep in entry_points(group=ep_package):
        packages.append((ep.name, ep.value, ep.group))
    if packages:
        entry_point_packages[ep_package] = packages

    try:
        os.mkdir('./generated')
    except FileExistsError:
        pass

with open("./hooks/kolibri_plugins_entrypoints_hook.py", "w") as f:
    f.write("""# Runtime hook generated from spec file to support importlib.metadata entry_points.
from importlib import metadata

ep_packages = {}

default_entry_points = metadata.entry_points

def _generate_entry_points_object_for_group(group):
    return metadata.EntryPoints(metadata.EntryPoint(*ep) for ep in ep_packages[group])

def monkey_patched_entry_points(**params):
    value = default_entry_points(**params)
    group = params.get("group")
    if group is not None and group in ep_packages:
        value[group] = _generate_entry_points_object_for_group(group)
    if not params:
        for group in ep_packages:
            value[group] = _generate_entry_points_object_for_group(group)
    return value

metadata.entry_points = monkey_patched_entry_points
""".format(entry_point_packages))

datas_list = [
    ('src/kolibri_app/assets', 'kolibri_app/assets'),
] + locale_datas

if sys.platform == "win32":
    datas_list.extend([
        ('src/kolibri_app/icons', 'kolibri_app/icons'),
        ('nssm.exe', 'nssm')
    ])

binaries_list = []
if sys.platform == "win32":
    dll_path = os.path.join(os.path.dirname(wx.__file__), 'WebView2Loader.dll')
    if os.path.exists(dll_path):
        binaries_list.append((dll_path, '.'))
    else:
        print(
            "WARNING: WebView2Loader.dll is missing, "
            "WebView2 functionality will NOT work and app will fallback to using IE11."
        )

a = Analysis(
    [os.path.join('src', 'kolibri_app', '__main__.py')],
    pathex=['kolibrisrc', os.path.join('kolibrisrc', 'kolibri', 'dist')],
    binaries=binaries_list,
    datas=datas_list,
    hiddenimports=['_cffi_backend'],
    hookspath=['hooks'],
    runtime_hooks=['hooks/pyi_rth_kolibri.py', 'hooks/kolibri_plugins_entrypoints_hook.py'],
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
    icon='src/kolibri_app/icons/kolibri.ico'
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
        icon="src/kolibri_app/icons/kolibri.icns",
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
                "CFBundleVersion": kolibri_version,
            },
        }
    )
