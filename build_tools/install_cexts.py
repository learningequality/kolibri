#!/usr/bin/env python
import argparse
import os
import shutil
import subprocess
import sys

import requests
from bs4 import BeautifulSoup

DIST_CEXT = 'kolibri/dist/cext'
PYPI_DOWNLOAD = 'https://pypi.python.org/simple/'
PIWHEEL_DOWNLOAD = 'https://www.piwheels.hostedpi.com/simple/'


def get_path_with_arch(platform, path, abi, implementation, python_version):
    """
    Calculate package path according to the platform.
    """

    # Split the platform into two parts.
    # For example: manylinux1_x86_64 to Linux, x86_64
    platform_split = platform.replace('manylinux1', 'Linux').split('_', 1)

    # Windows 32-bit's machine name is x86.
    if platform_split[0] == 'win32':
        return os.path.join(path, 'Windows', 'x86')

    # Prior to CPython 3.3, there were two ABI-incompatible ways of building CPython
    # There could be abi tag 'm' for narrow-unicode and abi tag 'mu' for wide-unicode
    if implementation == 'cp' and int(python_version) < 33:
        return os.path.join(path, platform_split[0], abi, platform_split[1])

    return os.path.join(path, platform_split[0], platform_split[1])


def download_package(path, platform, version, implementation, abi, name, pk_version, index_url):
    """
    Download the package according to platform, python version, implementation and abi.
    """
    return_code = subprocess.call([
        'python', 'kolibripip.pex', 'download', '-q', '-d', path, '--platform', platform,
        '--python-version', version, '--implementation', implementation,
        '--abi', abi, '-i', index_url, '{}=={}'.format(name, pk_version)
    ])

    # When downloaded as a tar.gz, convert to a wheel file first.
    # This is specifically for pycparser package.
    files = os.listdir(path)
    for file in files:
        if file.endswith('tar.gz'):
            subprocess.call([
                'python', 'kolibripip.pex', 'wheel', '-q', '-w',
                path, os.path.join(path, file), '--no-deps'])
            os.remove(os.path.join(path, file))

    return return_code


def install_package_by_wheel(path):
    """
    Install the package using the downloaded wheel files.
    """
    files = os.listdir(path)
    for file in files:
        return_code = subprocess.call([
            'python', 'kolibripip.pex', 'install', '-q', '-t',
            path, os.path.join(path, file), '--no-deps'
        ])
        if return_code == 1:
            sys.exit('\nInstallation failed for package {}.\n'.format(file))
        else:
            # Clean up the whl file and dist-info folder
            os.remove(os.path.join(path, file))
            shutil.rmtree(
                os.path.join(
                    path, '-'.join(file.split('-', 2)[:2])+'.dist-info'), ignore_errors=True)


def parse_package_page(files, pk_version, index_url):
    """
    Parse the PYPI and Piwheels link for the package and install the desired wheel files.
    """

    for file in files.find_all('a'):
        # We are not going to install the packages if they are:
        #   * not a whl file
        #   * not the version specified in requirements.txt
        #   * not python versions that kolibri supports
        #   * not macosx or win_x64 platforms,
        #     since the process of setup wizard has been fast enough
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
        if 'win_amd64' in platform:
            continue

        print('Installing {}...'.format(file.string))

        version_path = os.path.join(DIST_CEXT, file_name_chunks[2])
        package_path = get_path_with_arch(platform, version_path, abi, implementation, python_version)

        download_return = download_package(
            package_path, platform, python_version, implementation, abi, package_name,
            pk_version, index_url)

        # Successfully download package
        if download_return == 0:
            install_package_by_wheel(package_path)
        # Download failed
        else:
            # see https://github.com/learningequality/kolibri/issues/4656
            print('\nDownload failed for package {}.\n'.format(file.string))

            # We still need to have the program exit with error
            # if something wrong with PyPi download.
            if index_url == PYPI_DOWNLOAD:
                sys.exit(1)


def install(name, pk_version):
    """
    Start installing from the pypi and piwheels pages of the package.
    """
    links = [PYPI_DOWNLOAD, PIWHEEL_DOWNLOAD]
    for link in links:
        r = requests.get(link + name)
        if r.status_code == 200:
            files = BeautifulSoup(r.content, 'html.parser')
            parse_package_page(files, pk_version, link)
        else:
            sys.exit('\nUnable to find package {} on {}.\n'.format(name, link))


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
