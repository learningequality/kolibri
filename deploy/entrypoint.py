import logging
import os
import subprocess
import sys
import urllib

PEX_DOWNLOAD_LOCATION = "/usr/bin"
PEX_FILE_NAME = "kolibri.pex"

DEFAULT_PEX_URL = "https://github.com/learningequality/kolibri/releases/download/v0.9.2/kolibri-0.9.2.pex"


logging.basicConfig(level=logging.INFO)


def download_pex(url):
    logging.info("Downloading and running the pex file from {}".format(url))
    pex_path = pex_file_path()
    urllib.urlretrieve(url, pex_path)
    logging.info("Pex file saved to {}".format(pex_path))


def pex_file_path():
    return os.path.join(PEX_DOWNLOAD_LOCATION, PEX_FILE_NAME)


def run_pex():
    args = sys.argv[1:]
    subprocess.call(["python", pex_file_path()] + args)


if __name__ == "__main__":
    pex_url = os.getenv("PEX_URL") or DEFAULT_PEX_URL
    download_pex(pex_url)
    run_pex()
