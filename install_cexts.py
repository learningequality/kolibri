#!/usr/bin/env python
import os
import sys
import subprocess
import argparse
import imp
import shutil


DIST_CEXT = 'kolibri/dist/cext'
PYPI_DOWNLOAD = 'https://pypi.python.org/simple/'
PIWHEEL_DOWNLOAD = 'https://www.piwheels.hostedpi.com/simple/'


"""
Check if requests and bs4 modules are installed.
"""
def _install_requests_and_bs4_if_needed():
    try:
        imp.find_module('requests')
        print ('requests module exists')
    except ImportError:
        subprocess.call(['pip', 'install', 'requests'])

    try:
        imp.find_module('bs4')
        print ('bs4 module exists')
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

    # For cryptography module, all the macosxs >= 10.9 are supported 
    if 'macosx' in platform:
        platform = 'macosx'

    path = os.path.join(path, platform)

    return path


def download_package(path, platform, version, implementation, abi, name):
    """
    Download the package according to platform, python version, implementation and abi.
    """
    if 'arm' in platform:
        index_url = PIWHEEL_DOWNLOAD
    else:
        index_url = PYPI_DOWNLOAD

    return_code = subprocess.call(['python', 'kolibripip.pex', 'download', '-q', '-d', path, '--platform', platform, 
        '--python-version', version, '--implementation', implementation, 
        '--abi', abi, '-i', index_url, name])
    return return_code


def install_package_by_wheel(path, name):
    """
    Install the package using the cached wheel files.
    """
    return_code = subprocess.call(['python', 'kolibripip.pex', 'install', '-q', '-t', 
        path, os.path.join(path, name)])
    if return_code == 1:
        print ('Installation failed for package {}\n'.format(name))
    else:
        # Clean up all the whl files and dist-info folders in the directory
        for item in os.listdir(path):
            if item.endswith('.whl'):
                os.remove(os.path.join(path, item))
            elif item.endswith('dist-info'):
                shutil.rmtree(os.path.join(path, item), ignore_errors=True)


def parse_package_page(files, pkg_path, pkg_name):
    """
    Parse the PYPI and Piwheel link for the package and install the desired wheel files.
    """

    file_dict = {}
    for file in files.find_all('a'):
        file_name = file.string.split('-')

        # If the file format is tar.gz or the package version is not the latest, ignore
        if file_name[-1].split('.')[-1] != 'whl' or file_name[2][2:] == '26':
            continue

        if file_name[1] in file_dict:
            file_dict[file_name[1]].append(file)
        else:
            file_dict[file_name[1]] = [file]

    # If the c extension doesn't ship any whl, then just install the tar.gz file
    if not file_dict:
        if sys.platform.startswith('linux'):
            path = os.path.join(pkg_path, 'linux')
            print ('Installing {}...'.format(pkg_name))
            return_code = subprocess.call(['pip', 'install', '-q', '-t',
            path, pkg_name])
            if return_code == 1:
                print ('Installation failed for package {}\n'.format(pkg_name))
                return False
            else:
                return True
        else:
            return True

    # Get the latest version of the c extension to install
    latest_version = sorted(file_dict.keys())[-1]
    for file in file_dict[latest_version]:
        file_name = file.string.split('-')
        print ('Installing {}...'.format(file.string))

        implementation = file_name[2][:2]
        python_version = file_name[2][2:]
        
        path = os.path.join(pkg_path, file_name[2])
        abi = file_name[3]
        platform = file_name[4].split('.')[0]

        #  Prior to CPython 3.3, there were two ABI-incompatible ways of building CPython
        if 'linux' in platform and implementation == 'cp' and int(python_version) < 33:
            # There could be abi tag 'm' for narrow-unicode and abi tag 'mu' for wide-unicode
            path = os.path.join(os.path.join(path, 'linux'), abi)
        path = get_path_with_arch(platform, path)
        if path == '':
            # Package is not supported in this platform
            continue

        download_return = download_package(path, platform, python_version, 
            implementation, abi, file_name[0])
        
        # Successfully downloaded package
        if download_return == 0:
            install_package_by_wheel(path, file.string)
        # Download failed
        else:
            print ('Download failed for package {}\n'.format(file.string))


def install(name):
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
                path = os.path.join(DIST_CEXT, name)
                parse_package_page(files, path, name)

    except ImportError:
        raise ImportError('Importing modules failed.\n')


def parse_requirements(args):
    """
    Parse the requirements.txt to get packages' names and versions,
    then install them.
    """
    with open(args.file) as f:
        for line in f:
            # Install package according to its name and version
            install(line.strip())


if __name__ == '__main__':
    # Parsing the requirement.txt file argument
    parser = argparse.ArgumentParser(description="Downloading and installing Python C extensions tool.")
    parser.add_argument('--file', required=True, help='The name of the requirements.txt')
    args = parser.parse_args()
    parse_requirements(args)
