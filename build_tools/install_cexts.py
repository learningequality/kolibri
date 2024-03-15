"""
This module defines functions to install c extensions for all the platforms into
Kolibri.

See requirements/build.txt for the list of requirements that must be installed for this
script to run.
Usage:
> python build_tools/install_cexts.py --file "requirements/cext.txt" --cache-path "/cext_cache"

It reads the package name and version from requirements/cext.txt file and
installs the package and its dependencies using `pip install` with cache_path as
the cache directory. It installs from PyPi for platforms such as manylinux,
Windows and Piwheels for platforms such as ARM Linux. Please check the
description of the function `parse_package_page` to see the platforms we skip
downloading.

When Kolibri starts, the function `prepend_cext_path` in `env.py` will calculate
the c extension path based on system information and add it to sys.path so
Kolibri can import the c extension.

The cache directory is mainly used to stabilize the installation of c extensions
from Piwheels website for the builds on Buildkite. If the directory of the cache_path
passed into the function is not writable, a folder named `cext_cache` will be
created under the directory where the script runs to store the cache data.
"""
import argparse
import logging
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

logger = logging.getLogger(__name__)


def get_path_with_arch(platform, path, abi, implementation, python_version):
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
        return os.path.join(path, "Windows", "x86")
    # Windows 64-bit
    elif platform_split[0] == "win":
        return os.path.join(path, "Windows", "AMD64")

    # Prior to CPython 3.3, there were two ABI-incompatible ways of building CPython
    # There could be abi tag 'm' for narrow-unicode and abi tag 'mu' for wide-unicode
    if implementation == "cp" and int(python_version) < 33:
        return os.path.join(path, platform_split[0], abi, platform_split[1])

    return os.path.join(path, platform_split[0], platform_split[1])


def run_pip_install(
    path,
    platform,
    version,
    implementation,
    abi,
    name,
    pk_version,
    index_url,
    cache_path,
):
    """
    Install the package and its dependencies according to platform,
    python version, implementation and abi using `pip install` with cache_path as
    the cache directory.
    """
    return_code = subprocess.call(
        [
            "pip",
            "install",
            "-q",
            "-t",
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
            "--cache-dir",
            cache_path,
            "--only-binary=:all:",
            "--no-deps",
            "{}=={}".format(name, pk_version),
        ]
    )

    return return_code


def install_package(package_name, package_version, index_url, info, cache_path):
    """
    Install packages based on the information we gather from the index_url page
    """
    for item in info:
        platform = item["platform"]
        implementation = item["implementation"]
        python_version = item["version"]
        abi = item["abi"]
        filename = "-".join([package_name, package_version, abi, platform])

        # Calculate the path that the package will be installed into
        # Cryptography builds for Linux target Python 3.6+ but the only existing
        # build is labeled 3.6 (the lowest version supported).
        # So install abi3 packages into a separate folder to be used across all Python 3 versions.
        # https://cryptography.io/en/latest/faq/#why-are-there-no-wheels-for-my-python3-x-version
        version_path = os.path.join(
            DIST_CEXT, abi if abi == "abi3" else implementation + python_version
        )
        package_path = get_path_with_arch(
            platform, version_path, abi, implementation, python_version
        )

        logger.info("Installing package {}...".format(filename))
        # Install the package using pip with cache_path as the cache directory
        install_return = run_pip_install(
            package_path,
            platform,
            python_version,
            implementation,
            abi,
            package_name,
            package_version,
            index_url,
            cache_path,
        )

        # Ignore Piwheels installation failure because the website is not always stable
        if install_return == 1 and index_url == PYPI_DOWNLOAD:
            sys.exit("\nInstallation failed for package {}.\n".format(filename))
        else:
            # Clean up .dist-info folders
            dist_info_folders = os.listdir(package_path)
            for folder in dist_info_folders:
                if folder.endswith(".dist-info"):
                    shutil.rmtree(os.path.join(package_path, folder))


supported_python3_versions = ["36", "37", "38", "39", "310", "311"]


def parse_package_page(files, pk_version, index_url, cache_path):
    """
    Parse the PYPI and Piwheels links for the package information.
    We are not going to install the packages if they are:
        * not a whl file
        * not the version specified in requirements.txt
        * not python versions that kolibri does not support
        * not macosx
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
        if python_version not in supported_python3_versions:
            continue
        if "macosx" in platform:
            continue

        info = {
            "platform": platform,
            "implementation": implementation,
            "version": python_version,
            "abi": abi,
        }
        result.append(info)

    install_package(package_name, pk_version, index_url, result, cache_path)


def parse_pypi_and_piwheels(name, pk_version, cache_path, session):
    """
    Start installing from the pypi and piwheels pages of the package.
    """
    links = [PYPI_DOWNLOAD, PIWHEEL_DOWNLOAD]
    for link in links:
        url = link + name
        for _ in range(5):
            try:
                r = session.get(url)
                r.raise_for_status()
            except Exception as e:
                logger.info("Error retrieving {}: {}".format(url, e))
            else:
                if r.status_code == 200:
                    # Got a valid response
                    break

                logger.info(
                    "Unexpected response from {}: {} {}".format(
                        url, r.status_code, r.reason
                    )
                )

            # Clear the response in case this is the last iteration
            r = None

        if r:
            files = BeautifulSoup(r.content, "html.parser")
            parse_package_page(files, pk_version, link, cache_path)
        else:
            sys.exit("\nUnable to find package {} on {}.\n".format(name, link))


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
    except (OSError, IOError):
        new_path = os.path.realpath("cext_cache")
        logger.info(
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
    # pip version needs to be greater than 19.3.1 to run this script
    # see https://github.com/pypa/pip/issues/6070
    pip_version = str(subprocess.check_output(["pip", "--version"]))
    pip_version_major = int(str(pip_version).split(".")[0].split("pip")[1].strip())
    if pip_version_major < 20:
        sys.exit(
            "pip version is lower or equal to 19.3.1. Please upgrade the pip version to run this script."
        )

    # Start a requests session to reuse HTTP connections
    session = requests.Session()

    with open(args.file) as f:
        cache_path = os.path.realpath(args.cache_path)
        cache_path = check_cache_path_writable(cache_path)
        for line in f:
            char_list = line.split("==")
            if len(char_list) == 2:
                # Parse PyPi and Piwheels pages to install package according to
                # its name and version
                parse_pypi_and_piwheels(
                    char_list[0].strip(), char_list[1].strip(), cache_path, session
                )
            # Ignore comments
            elif not line.startswith("#"):
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
