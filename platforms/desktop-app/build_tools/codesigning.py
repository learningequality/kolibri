import os
import subprocess
import sys


def notarize_mac_build():
    assert sys.platform.startswith("darwin"), "This command must be run on macOS."
    dev_email = os.getenv("MAC_DEV_ID_EMAIL")
    dev_pass = os.getenv("MAC_CODESIGN_PASSWORD")
    if not dev_email or dev_pass:
        print("You must specify your Apple developer account information using the MAC_DEV_ID_EMAIL")
        print("and MAC_CODESIGN_PASSWORD environment variables in order to codesign the build.")
        sys.exit(1)
    bundle_id = "org.learningequality.Kolibri"
    app = "Kolibri.app"
    zip = '{}.zip'.format(app)

    os.chdir("dist/osx")
    assert os.path.exists(app), "You need to build an app to be notarized first."

    if os.path.exists(zip):
        os.remove(zip)

    cmd = ['zip', '-yr', zip, app]
    subprocess.call(cmd)

    assert os.path.exists(zip), "You need to build an app to be notarized first."

    cmd = [
        "xcrun", "altool", "--notarize-app",
        "--file", zip,
        "--type", "osx",
        "--username", dev_email,
        "--primary-bundle-id", bundle_id
    ]

    cmd.extend(['--password', dev_pass])

    subprocess.call(cmd)

def codesign_windows_build():
    assert sys.platform.startswith("win"), "This command must be run on Windows."

    pfx = os.getenv("WIN_CODESIGN_PFX")
    cert = os.getenv("WIN_CODESIGN_CERT")

    assert pfx and cert, "To sign the build, you must set WIN_CODESIGN_PFX and WIN_CODESIGN_CERT environment variables."

    pfx = os.path.abspath(pfx)
    cert = os.path.abspath(cert)

    assert os.path.exists(pfx), "Cannot find PFX file for signing."
    assert os.path.exists(cert), "Cannot find certificate for signing at {}.".format(cert)

    os.chdir('dist/win')
    binary = 'kolibri.exe'
    if not os.path.exists(binary):
        binary = r'Kolibri\kolibri.exe'

    signtool = r"C:\Program Files (x86)\Windows Kits\8.1\bin\x64\signtool.exe"

    cmd = [signtool, "sign", "/f", pfx, "/p", os.environ['WIN_CODESIGN_PWD'],
           "/ac", cert, "/tr", "http://timestamp.ssl.trustwave.com", "/td", "SHA256",
           "/fd", "SHA256", binary]

    subprocess.call(cmd)
