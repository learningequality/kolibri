import glob
import os
import shutil
import subprocess
import time
import zipfile

from urllib.error import URLError
from urllib.request import urlopen

import requests

from .constants import KOLIBRI_EXCLUDE_DIRS


def remove_unneeded_files():
    for exclude in KOLIBRI_EXCLUDE_DIRS:
        exclude_files = glob.glob(exclude)
        for exclude_file in exclude_files:
            print("Removing file {}".format(exclude_file))
            if os.path.isdir(exclude_file):
                shutil.rmtree(exclude_file)
            else:
                os.remove(exclude_file)


def wait_for_kolibri(port):
    home_url = 'http://127.0.0.1:{}'.format(port)

    while True:
        try:
            urlopen(home_url)
            return True
        except URLError as e:
            time.sleep(1)


def preseed_kolibri(whl):
    env = os.environ.copy()
    kolibri_env = 'tmpenv'
    preseed_dir = 'assets/preseeded_kolibri_home'
    env['PYTHONPATH'] = kolibri_env
    env['KOLIBRI_HOME'] = preseed_dir
    if 'KOLIBRI_PRESEED_CONTENT_DIRS' in env:
        env['KOLIBRI_CONTENT_FALLBACK_DIRS'] = env['KOLIBRI_PRESEED_CONTENT_DIRS']

    # clean any previous run data first
    if os.path.exists(kolibri_env):
        shutil.rmtree(kolibri_env)
    if os.path.exists(preseed_dir):
        shutil.rmtree(preseed_dir)

    subprocess.call(['pip', 'install', '--target', kolibri_env, whl])
    port = 16294
    kolibri_bin = 'tmpenv/bin/kolibri'
    subprocess.Popen([kolibri_bin, 'start', '--port={}'.format(port)], env=env)
    wait_for_kolibri(port)

    subprocess.check_call([kolibri_bin, 'stop'], env=env)

    subprocess.run([kolibri_bin, 'manage', 'deprovision'], input=b"yes\nyes", env=env)
    subdirs_to_remove = ['logs', 'process_cache', 'sessions']
    for subdir in subdirs_to_remove:
        shutil.rmtree(os.path.join(preseed_dir, subdir))

    # touch the was_preseeded file
    open(os.path.join(preseed_dir, 'was_preseeded'), 'a')


def get_kolibri_releases():
    url = 'https://api.github.com/repos/learningequality/kolibri/tags'
    response = requests.get(url)
    return response.json()


def get_latest_kolibri_release(include_prereleases=False):
    release = None
    releases = get_kolibri_releases()
    if include_prereleases:
        release = releases[0]
    else:
        # find the latest release without an -alpha, -beta, or -rc in the version.
        for k_release in releases:
            if '-' not in k_release['name']:
                release = k_release
                break

    assert release, "Unable to retrieve the latest Kolibri release"
    return get_kolibri_release_whl(release['name'])


def get_kolibri_release_whl(release_tag):
    url_temp = "https://github.com/learningequality/kolibri/releases/download/{version}/kolibri-{version_short}-py2.py3-none-any.whl"
    build_version = release_tag[1:]
    build_monikers = {
        '-beta': 'b',
        '-rc': 'rc',
        '-alpha': 'a'
    }
    for m in build_monikers:
        build_version = build_version.replace(m, build_monikers[m])

    args = {
        "version": release_tag,
        "version_short": build_version  # remove the beta info and the v in the front.
    }

    url = url_temp.format(**args)
    print("Getting release from {}".format(url))

    local_filename = os.path.join('whl', url.split('/')[-1])
    os.makedirs(os.path.dirname(local_filename), exist_ok=True)
    with requests.get(url, stream=True) as r:
        with open(local_filename, 'wb') as f:
            shutil.copyfileobj(r.raw, f)

    return local_filename


def update_kolibri(args):
    if args.kolibri_version is not None:
        whl = get_kolibri_release_whl(args.kolibri_version)
    elif args.custom_whl:
        whl = glob.glob('whl/*.whl')[0]
    else:
        whl = get_latest_kolibri_release(include_prereleases=(not args.exclude_prereleases))

    kolibri_dir = 'src/kolibri'
    if os.path.exists(kolibri_dir):
        shutil.rmtree(kolibri_dir)

    zip = zipfile.ZipFile(whl)
    zip.extractall('src')

    remove_unneeded_files()

    if not args.skip_preseed:
        preseed_kolibri(whl)


if __name__ == '__main__':
    update_kolibri()
