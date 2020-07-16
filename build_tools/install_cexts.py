#!/usr/bin/env python
import argparse
import os
import shutil
import subprocess
import sys

import requests
from bs4 import BeautifulSoup

DIST_CEXT = os.path.join(
    os.path.dirname(os.path.realpath(os.path.dirname(__file__))),
    "kolibri",
    "dist",
    "cext",
)
PYPI_DOWNLOAD = "https://pypi.python.org/simple/"
PIWHEEL_DOWNLOAD = "https://www.piwheels.org/simple/"


def get_path_with_arch(platform, abi, implementation, python_version):
    """
    Calculate package path according to the platform.
    """

    # Split the platform into two parts.
    # For example: manylinux1_x86_64 to Linux, x86_64
    platform_split = (
        platform.replace("manylinux1", "Linux").replace("linux", "Linux").split("_", 1)
    )

    # Windows 32-bit's machine name is x86.
    if platform_split[0] == "win32":
        return os.path.join("Windows", "x86")
    # Windows 64-bit
    elif platform_split[0] == "win":
        return os.path.join("Windows", "AMD64")

    # Prior to CPython 3.3, there were two ABI-incompatible ways of building CPython
    # There could be abi tag 'm' for narrow-unicode and abi tag 'mu' for wide-unicode
    if implementation == "cp" and int(python_version) < 33:
        return os.path.join(platform_split[0], abi, platform_split[1])

    return os.path.join(platform_split[0], platform_split[1])


def download_package(
    path, platform, version, implementation, abi, name, pk_version, index_url
):
    """
    Download the package according to platform, python version, implementation and abi.
    """
    return_code = subprocess.call(
        [
            "pip",
            "download",
            "-q",
            "-d",
            path,
            "--platform",
            platform,
            "--python-version",
            version,
            "--implementation",
            implementation,
            "--abi",
            abi,
            "-i",
            index_url,
            "--only-binary=:all:",
            "{}=={}".format(name, pk_version),
        ]
    )

    return return_code


def install_package_by_wheel(path):
    """
    Install the package using the downloaded wheel files.
    """
    files = os.listdir(path)
    for file in files:
        # When the abi tag is abi3, the package has been installed, and a dist-info
        # folder has been generated. Skip the installed package and remove the
        # dist-info folder.
        if os.path.isdir(os.path.join(path, file)):
            if file.endswith(".dist-info"):
                shutil.rmtree(os.path.join(path, file))
            continue

        # If the file is py2, py3 compatible, install it into kolibri/dist/cext
        # instead of specific platform paths to reduce the size of installer
        if "py2.py3-none-any" in file:
            return_code = subprocess.call(
                [
                    "pip",
                    "install",
                    "-q",
                    "-U",
                    "-t",
                    DIST_CEXT,
                    os.path.join(path, file),
                    "--no-deps",
                ]
            )
        else:
            return_code = subprocess.call(
                [
                    "pip",
                    "install",
                    "-q",
                    "-t",
                    path,
                    os.path.join(path, file),
                    "--no-deps",
                ]
            )

        if return_code == 1:
            sys.exit("\nInstallation failed for package {}.\n".format(file))
        else:
            # Clean up the whl file and dist-info folder
            os.remove(os.path.join(path, file))
            shutil.rmtree(
                os.path.join(path, "-".join(file.split("-", 2)[:2]) + ".dist-info"),
                ignore_errors=True,
            )


def download_and_install(package_name, package_version, index_url, info, cache_path):
    """
    Download and install packages based on the information we gather from the index_url page
    """
    for item in info:
        platform = item["platform"]
        implementation = item["implementation"]
        python_version = item["version"]
        abi = item["abi"]
        filename = "-".join([package_name, package_version, abi, platform])

        # Calculate the path that the package will be installed into
        version_path = os.path.join(cache_path, implementation + python_version)
        package_path = get_path_with_arch(platform, abi, implementation, python_version)
        volume_package_path = os.path.join(version_path, package_path)

        print("Downloading package {}...".format(filename))
        # Download the package to the cache folder
        download_return = download_package(
            volume_package_path,
            platform,
            python_version,
            implementation,
            abi,
            package_name,
            package_version,
            index_url,
        )

        # Successfully download package
        if download_return == 0:
            # Copy the files downloaded in cache_path to DIST_CEXT
            install_path = volume_package_path.replace(cache_path, DIST_CEXT)
            shutil.copytree(volume_package_path, install_path)
            print("Installing package {}...".format(filename))
            install_package_by_wheel(install_path)
        # Download failed
        else:
            # see https://github.com/learningequality/kolibri/issues/4656
            print("\nDownload failed for package {}.\n".format(filename))

            # We still need to have the program exit with error
            # if something wrong with PyPi download.
            if index_url == PYPI_DOWNLOAD:
                sys.exit(1)


def parse_package_page(files, pk_version, index_url, cache_path):
    """
    Parse the PYPI and Piwheels link for the package information.
    We are not going to install the packages if they are:
        * not a whl file
        * not the version specified in requirements.txt
        * not python versions that kolibri does not support
        * not macosx
        * not win_x64 with python 3.6
    """

    result = []
    for file in files.find_all("a"):
        # Skip if not a whl file
        if not file.string.endswith("whl"):
            continue

        file_name_chunks = file.string.split("-")

        package_version = file_name_chunks[1]
        package_name = file_name_chunks[0]
        python_version = file_name_chunks[2][2:]
        platform = file_name_chunks[4].split(".")[0]
        implementation = file_name_chunks[2][:2]
        abi = file_name_chunks[3]

        if package_version != pk_version:
            continue
        if python_version == "26":
            continue
        if "macosx" in platform:
            continue
        if "win_amd64" in platform and python_version != "36":
            continue

        # Cryptography builds for Linux target Python 3.4+ but the only existing
        # build is labeled 3.4 (the lowest version supported).
        # Expand the abi3 tag here. e.g. cp34 abi3 is expanded to cp34m, cp35m, cp36m, cp37m
        # https://cryptography.io/en/latest/faq/#why-are-there-no-wheels-for-python-3-6-on-linux-or-macos
        if abi == "abi3":
            for actual_version in range(int(python_version), 38):
                actual_version = str(actual_version)
                actual_abi = "".join([implementation, actual_version, "m"])
                info = {
                    "platform": platform,
                    "implementation": implementation,
                    "version": actual_version,
                    "abi": actual_abi,
                }
                result.append(info)
        else:
            info = {
                "platform": platform,
                "implementation": implementation,
                "version": python_version,
                "abi": abi,
            }
            result.append(info)

    download_and_install(package_name, pk_version, index_url, result, cache_path)


def install(name, pk_version, cache_path):
    """
    Start installing from the pypi and piwheels pages of the package.
    """
    links = [PYPI_DOWNLOAD, PIWHEEL_DOWNLOAD]
    for link in links:
        r = requests.get(link + name)
        if r.status_code == 200:
            files = BeautifulSoup(r.content, "html.parser")
            parse_package_page(files, pk_version, link, cache_path)
        else:
            sys.exit("\nUnable to find package {} on {}.\n".format(name, link))

    # Clean up .dist-info folders
    files = os.listdir(DIST_CEXT)
    for file in files:
        if file.endswith(".dist-info"):
            shutil.rmtree(os.path.join(DIST_CEXT, file))


def check_cache_path_writable(cache_path):
    """
    If the defined cache path is not writable, change it to a folder named
    cext_cache under the current directory where the script runs.
    """
    try:
        check_file = os.path.join(cache_path, "check.txt")
        with open(check_file, "w") as f:
            f.write("check")
        os.remove(check_file)
        return cache_path
    except OSError:
        new_path = os.path.realpath("cext_cache")
        print(
            "The cache directory {old_path} is not writable. Changing to directory {new_path}.".format(
                old_path=cache_path, new_path=new_path
            )
        )
        return new_path


def parse_requirements(args):
    """
    Parse the requirements.txt to get packages' names and versions,
    then install them.
    """
    with open(args.file) as f:
        cache_path = os.path.realpath(args.cache_path)
        cache_path = check_cache_path_writable(cache_path)
        for line in f:
            char_list = line.split("==")
            if len(char_list) == 2:
                # Install package according to its name and version
                install(char_list[0].strip(), char_list[1].strip(), cache_path)
            else:
                sys.exit(
                    "\nName format in cext.txt is incorrect. Should be 'packageName==packageVersion'.\n"
                )


if __name__ == "__main__":
    # Parsing the requirement.txt file argument
    parser = argparse.ArgumentParser(
        description="Downloading and installing Python C extensions tool."
    )
    parser.add_argument(
        "--file", required=True, help="The name of the requirements.txt"
    )
    parser.add_argument(
        "--cache-path",
        default="/cext_cache",
        help="The path in which pip cache data is stored",
    )
    args = parser.parse_args()
    parse_requirements(args)
