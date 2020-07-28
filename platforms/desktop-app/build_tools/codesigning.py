import glob
import os
import subprocess


def notarize_mac_build():
    dev_email = os.getenv("MAC_DEV_ID_EMAIL", "kevin@learningequality.org")
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

    if 'MAC_CODESIGN_PASSWORD' in os.environ:
        cmd.extend(['--password', os.environ['MAC_CODESIGN_PASSWORD']])
    else:
        assert False, "os.environ = {}".format(os.environ)

    subprocess.call(cmd)
