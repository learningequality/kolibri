#!/usr/bin/env python
import argparse
import imp
import os
import shutil
import subprocess
import sys

DIST_CEXT = 'kolibri/dist/cext'
PYPI_DOWNLOAD = 'https://pypi.python.org/simple/'
PIWHEEL_DOWNLOAD = 'https://www.piwheels.hostedpi.com/simple/'


"""
Check if requests and bs4 modules are installed.
"""
def _install_requests_and_bs4_if_needed():
    try:
        imp.find_module('requests')
        print('requests module exists')
    except ImportError:
        subprocess.call(['pip', 'install', 'requests'])

    try:
        imp.find_module('bs4')
        print('bs4 module exists')
    except ImportError:
        subprocess.call(['pip', 'install', 'bs4'])


def get_path_with_arch(platform, path):
    """
    Distribute packages into folders according to the platform.
    """

    # Change the platform name into correct formats
    platform = platform.replace('_', '-')
    platform = platform.replace('x86-64', 'x86_64')
    platform = platform.replace('manylinux1', 'linux')

    path = os.path.join(path, platform)

    return path


def download_package(path, platform, version, implementation, abi, name, pk_version):
    """
    Download the package according to platform, python version, implementation and abi.
    """
    if 'arm' in platform:
        index_url = PIWHEEL_DOWNLOAD
    else:
        index_url = PYPI_DOWNLOAD

    return_code = subprocess.call([
        'python', 'kolibripip.pex', 'download', '-q', '-d', path, '--platform', platform,
        '--python-version', version, '--implementation', implementation,
        '--abi', abi, '-i', index_url, '{}=={}'.format(name, pk_version)
    ])
    return return_code


def install_package_by_wheel(path, name):
    """
    Install the package using the cached wheel files.
    """
    return_code = subprocess.call([
        'python', 'kolibripip.pex', 'install', '-q', '-t',
        path, os.path.join(path, name)
    ])
    if return_code == 1:
        sys.exit('\nInstallation failed for package {}.\n'.format(name))
    else:
        # Clean up all the whl files and dist-info folders in the directory
        for item in os.listdir(path):
            if item.endswith('.whl'):
                os.remove(os.path.join(path, item))
            elif item.endswith('dist-info'):
                shutil.rmtree(os.path.join(path, item), ignore_errors=True)


def parse_package_page(files, pk_version):
    """
    Parse the PYPI and Piwheel link for the package and install the desired wheel files.
    """

    for file in files.find_all('a'):
        # We are not going to install the packages if they are:
        #   * not a whl file
        #   * not the version specified in requirements.txt
        #   * not python versions that kolibri supports
        #   * not macosx or any 64-bit platforms, since the process of setup wizard has been fast enough
        file_name_chunks = file.string.split('-')

        # When the length of file_name_chunks is 2, it means the file is tar.gz.
        if len(file_name_chunks) == 2:
            continue

        package_version = file_name_chunks[1]
        package_name = file_name_chunks[0]
        python_version = file_name_chunks[2][2:]
        platform = file_name_chunks[4].split('.')[0]
        implementation = file_name_chunks[2][:2]
        abi = file_name_chunks[3]

        if package_version != pk_version:
            continue
        if python_version == '26':
            continue
        if 'macosx' in platform:
            continue
        if '64' in platform:
            continue

        print('Installing {}...'.format(file.string))

        path = os.path.join(DIST_CEXT, file_name_chunks[2])

        #  Prior to CPython 3.3, there were two ABI-incompatible ways of building CPython
        if 'linux' in platform and implementation == 'cp' and int(python_version) < 33:
            # There could be abi tag 'm' for narrow-unicode and abi tag 'mu' for wide-unicode
            path = os.path.join(os.path.join(path, 'linux'), abi)

        path = get_path_with_arch(platform, path)
        if path == '':
            # Package is not supported in this platform
            continue

        download_return = download_package(
            path, platform, python_version, implementation, abi, package_name,
            pk_version)

        # Successfully downloaded package
        if download_return == 0:
            install_package_by_wheel(path, file.string)
        # Download failed
        else:
            # see https://github.com/learningequality/kolibri/issues/4656
            print('\nDownload failed for package {}.\n'.format(file.string))
            continue
            # sys.exit('\nDownload failed for package {}.\n'.format(file.string))


def install(name, pk_version):
    """
    Start installing from the pypi page of the package.
    """
    _install_requests_and_bs4_if_needed()
    try:
        import requests
        from bs4 import BeautifulSoup

        # Parse everything in the package repo in both pypi and piwheel
        links = [PYPI_DOWNLOAD, PIWHEEL_DOWNLOAD]
        for link in links:
            r = requests.get(link + name)
            if r.status_code == 200:
                files = BeautifulSoup(r.content, 'html.parser')
                parse_package_page(files, pk_version)
            else:
                sys.exit('\nUnable to find package {} on {}.\n'.format(name, link))

    except ImportError:
        raise ImportError('\nImporting modules failed.\n')


def parse_requirements(args):
    """
    Parse the requirements.txt to get packages' names and versions,
    then install them.
    """
    with open(args.file) as f:
        for line in f:
            char_list = line.split('==')
            if len(char_list) == 2:
                # Install package according to its name and version
                install(char_list[0].strip(), char_list[1].strip())
            else:
                sys.exit('\nName format in cext.txt is incorrect. Should be \'packageName==packageVersion\'.\n')


if __name__ == '__main__':
    # Parsing the requirement.txt file argument
    parser = argparse.ArgumentParser(description="Downloading and installing Python C extensions tool.")
    parser.add_argument('--file', required=True, help='The name of the requirements.txt')
    args = parser.parse_args()
    parse_requirements(args)
