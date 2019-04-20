"""
This script is the first thing that runs when a Kolibri container starts and
receives as args the Kolibri command CMD, e.g., ['kolibri', 'start', '--foreground']
The purpose of this script is to perform optional 'setup tasks' before starting Kolibri.
The following environment variables are used for setup steps:
 - set KOLIBRI_PEX_URL to 'default' or something like http://host.org/nameof.pex
 - set DOCKERMNT_PEX_PATH to ``/docker/mnt/nameof.pex`` will run the from ``./docker/mnt/``
 - KOLIBRI_PROVISIONDEVICE_FACILITY  if set, provision facility with this name
 - CHANNELS_TO_IMPORT if set, comma separated list of channel IDs to import
"""
import logging
import os
import re
import subprocess
import sys


# py2+py3 compatible imports via http://python-future.org/compatible_idioms.html
try:
    from urllib.request import Request, build_opener, HTTPRedirectHandler
except ImportError:
    from urllib2 import Request, HTTPRedirectHandler, build_opener

logging.basicConfig(level=logging.INFO)


# SETTINGS
################################################################################
DEFAULT_KOLIBRI_PEX_URL = "https://learningequality.org/r/kolibri-pex-latest"


# ENV VARIABLES
################################################################################
# - KOLIBRI_PEX_URL set to 'default' or something like http://host.org/nameof.pex
# - DOCKERMNT_PEX_PATH`` to something like ``/docker/mnt/nameof.pex``
# - DEPLOY_TYPE in ['pex', 'source']  This will be detemined automatically based
#   on the presence of ENV vars KOLIBRI_PEX_URL and DOCKERMNT_PEX_PATH.
# - KOLIBRI_PROVISIONDEVICE_FACILITY  if set, provision facility with this name
# - CHANNELS_TO_IMPORT if set, comma separated list of channel IDs to import
DEFAULT_ENVS = {
    "WHICH_PYTHON": "python2",  # or python3 if you prefer; Kolibri don't care
    "KOLIBRI_HOME": "/kolibrihome",
    "KOLIBRI_HTTP_PORT": "8080",
    "KOLIBRI_LANG": "en",
    "KOLIBRI_RUN_MODE": "demoserver",
    "KOLIBRI_PROVISIONDEVICE_PRESET": "formal",  # other options are 'nonformal', 'informal'
    "KOLIBRI_PROVISIONDEVICE_SUPERUSERNAME": "devowner",
    "KOLIBRI_PROVISIONDEVICE_SUPERUSERPASSWORD": "admin123",
}


def set_default_envs():
    """
    Set default values for ENV variables and infer DEPLOY_TYPE.
    """
    envs = os.environ
    for key in DEFAULT_ENVS.keys():
        env = os.getenv(key, None)
        if env is None:
            envs[key] = DEFAULT_ENVS[key]

    # Logic to detemine DEPLOY_TYPE and KOLIBRI_PEX_PATH when using pex deploy
    ############################################################################
    # Check for edge case when both URL and BUILDPATH specified
    if "KOLIBRI_PEX_URL" in envs and "DOCKERMNT_PEX_PATH" in envs:
        logging.warning("Using DOCKERMNT_PEX_PATH and ignoring KOLIBRI_PEX_URL.")
        del envs["KOLIBRI_PEX_URL"]

    # CASE A: Running the pex at KOLIBRI_PEX_URL
    if "KOLIBRI_PEX_URL" in envs and "DOCKERMNT_PEX_PATH" not in envs:
        if envs["KOLIBRI_PEX_URL"] == "default":
            envs["KOLIBRI_PEX_URL"] = DEFAULT_KOLIBRI_PEX_URL
            pex_name = "kolibri-latest.pex"
        else:
            pex_name = os.path.basename(
                envs["KOLIBRI_PEX_URL"].split("?")[0]
            )  # in case ?querystr...
        envs["DEPLOY_TYPE"] = "pex"
        envs["KOLIBRI_PEX_PATH"] = os.path.join(envs["KOLIBRI_HOME"], pex_name)

    # CASE B: Running the pex from the /docker/mnt volume
    elif "DOCKERMNT_PEX_PATH" in envs and "KOLIBRI_PEX_URL" not in envs:
        pex_name = os.path.basename(envs["DOCKERMNT_PEX_PATH"])
        envs["DEPLOY_TYPE"] = "pex"
        envs["KOLIBRI_PEX_PATH"] = os.path.join(envs["KOLIBRI_HOME"], pex_name)

    # CASE C: If no PEX url is spefified, we'll run kolibri from source code
    else:
        envs["DEPLOY_TYPE"] = "source"


# FACILITY CREATION
################################################################################


def get_kolibri_version(kolibri_cmd):
    """
    Calls `kolibri_cmd` (list) to extract version information.
    The parameter `kolibri_cmd` can be either a kolibri command e.g. ['kolibri']
    or a Kolibri pex invocation like ['python', 'some.pex'].
    Returns tuple of ints (major, minor), or (None, None) if verison check fails.
    """
    MAJOR_MINOR_PAT = re.compile(r"^(?P<major>\d+)\.(?P<minor>\d+)(\.\d+)?.*")
    cmd = kolibri_cmd[:] + ["--version"]
    logging.info("Calling cmd {} to get the Kolibri version information.".format(cmd))
    cmd_str = " ".join(cmd)
    proc = subprocess.Popen(cmd_str, stdout=subprocess.PIPE, shell=True)
    line = proc.stdout.readline().decode("utf-8")
    m = MAJOR_MINOR_PAT.search(line)
    if m:
        major, minor = m.groupdict()["major"], m.groupdict()["minor"]
        return int(major), int(minor)
    else:
        return None, None


def create_facility(kolibri_cmd):
    """
    Create the facility so users don't have to go through setup wizard.
    We must use different appraoch based on Kolibri version:
      - Kolibri versions in range [0, 0.9)    --> SKIP
      - Kolibri versions in range [0.9, +     --> provisiondevice
    """
    logging.info("Running create_facility")
    major, minor = get_kolibri_version(kolibri_cmd)
    if major is None or minor is None:
        logging.warning("Failed to retrieve Kolibri version. Skipping.")
        return
    if major >= 1:
        provisiondevice(kolibri_cmd)
    if major == 0:
        if minor >= 9:
            provisiondevice(kolibri_cmd)
        else:
            logging.info("Skipping automated facility creation step.")


def provisiondevice(kolibri_cmd):
    envs = os.environ
    logging.info(
        ">" * 80
        + "\n"
        + "Provisioning device in facility {}".format(
            envs["KOLIBRI_PROVISIONDEVICE_FACILITY"]
        )
    )
    cmd = kolibri_cmd[:]
    cmd += ["manage", "provisiondevice"]
    cmd += ['--facility "{}"'.format(envs["KOLIBRI_PROVISIONDEVICE_FACILITY"])]
    cmd += ["--preset {}".format(envs["KOLIBRI_PROVISIONDEVICE_PRESET"])]
    cmd += ["--superusername {}".format(envs["KOLIBRI_PROVISIONDEVICE_SUPERUSERNAME"])]
    cmd += [
        "--superuserpassword {}".format(
            envs["KOLIBRI_PROVISIONDEVICE_SUPERUSERPASSWORD"]
        )
    ]
    cmd += ["--language_id {}".format(envs["KOLIBRI_LANG"])]
    cmd += ["--verbosity 0"]
    cmd += ["--noinput"]
    logging.debug("Provision command = {}".format(" ".join(cmd)))
    cmd_str = " ".join(cmd)
    subprocess.call(cmd_str, shell=True)


# OTHER SETUP TASKS
################################################################################


def import_channels(kolibri_cmd):
    """
    Import the channels in comma-separeted string `KOLIBRI_CHANNELS_TO_IMPORT`.
    """
    logging.info(">" * 80 + "\n" + "Importing content channels...")
    envs = os.environ
    assert "KOLIBRI_CHANNELS_TO_IMPORT" in envs, "no KOLIBRI_CHANNELS_TO_IMPORT"
    channels_list_str = envs["KOLIBRI_CHANNELS_TO_IMPORT"]
    channel_ids_to_import = map(str.strip, channels_list_str.split(","))

    importchannel_cmd = kolibri_cmd[:] + ["manage", "importchannel", "network"]
    importcontent_cmd = kolibri_cmd[:] + ["manage", "importcontent", "network"]
    for channel_id in channel_ids_to_import:
        importchannel_cmd_str = " ".join(importchannel_cmd + [channel_id])
        subprocess.call(importchannel_cmd_str, shell=True)
        importcontent_cmd_str = " ".join(importcontent_cmd + [channel_id])
        subprocess.call(importcontent_cmd_str, shell=True)


# PEX DEPLOY
################################################################################


class SmartRedirectHandler(HTTPRedirectHandler):
    """
    Helper to handle redirects (don't want to use `requests`; rely only stdlib).
    """

    def http_error_301(self, req, fp, code, msg, headers):
        result = HTTPRedirectHandler.http_error_301(self, req, fp, code, msg, headers)
        result.status = code
        return result

    def http_error_302(self, req, fp, code, msg, headers):
        result = HTTPRedirectHandler.http_error_302(self, req, fp, code, msg, headers)
        result.status = code
        return result


def copy_pex_file_to_kolibrihome():
    """
    Handles both the case when we get pex from a URL and from a local path.
    """
    envs = os.environ
    pex_path = envs["KOLIBRI_PEX_PATH"]
    if "KOLIBRI_PEX_URL" in envs and "DOCKERMNT_PEX_PATH" not in envs:
        logging.info("Downloading pex from {}".format(envs["KOLIBRI_PEX_URL"]))
        request = Request(
            envs["KOLIBRI_PEX_URL"], headers={"User-Agent": "Mozilla/5.0"}
        )
        opener = build_opener(SmartRedirectHandler())
        pex_response = opener.open(request)
        with open(pex_path, "wb") as pex_file:
            pex_file.write(pex_response.read())
    elif "DOCKERMNT_PEX_PATH" in envs and "KOLIBRI_PEX_URL" not in envs:
        logging.info("Copying pex from {}".format(envs["DOCKERMNT_PEX_PATH"]))
        with open(envs["DOCKERMNT_PEX_PATH"], "rb") as dockermnt_pex:
            with open(pex_path, "wb") as pex_file:
                pex_file.write(dockermnt_pex.read())
    logging.info("Pex file saved to {}".format(pex_path))


# MAIN LOGIC
################################################################################


def set_default_language(kolibri_cmd):
    """
    Set the default language for this installation of Kolibri. Any running
    instance of Kolibri needs to be restarted in order for this change to work.
    """
    envs = os.environ
    # Depends on vars: KOLIBRI_HOME and DJANGO_SETTINGS_MODULE
    cmd = kolibri_cmd[:] + ["language", "setdefault", envs["KOLIBRI_LANG"]]
    cmd_str = " ".join(cmd)
    subprocess.call(cmd_str, shell=True)


def run_kolibri(cmd):
    logging.info("Starting Kolibri using command {}".format(" ".join(cmd)))
    os.chdir("/kolibri")  # in case we're running from source and calling devserver
    cmd_str = " ".join(cmd)
    # Depends on vars: KOLIBRI_HOME, KOLIBRI_HTTP_PORT, and DJANGO_SETTINGS_MODULE
    subprocess.call(cmd_str, shell=True)
    # This results in pstree: init --> /docker/entrypoint.py --> sh --> kolibri
    # the extra sh-intemediary is because yarn needs to read ENV variables
    #
    # The option of running kolibri as PID 1, i.e. process tree init --> kolibri
    # does not work because kolibri (like all django servers) does not register
    # an explicit handler for ^C so killing container is harder (needs kill -9)


def get_kolibri_cmd(CMD):
    """
    Returns the appropriate Kolibri invocation for the current DEPLOY_TYPE.
    """
    envs = os.environ
    deploy_type = envs["DEPLOY_TYPE"]
    if deploy_type == "pex":
        python_cmd = envs["WHICH_PYTHON"]
        pex_path = envs["KOLIBRI_PEX_PATH"]
        kolibri_cmd = [python_cmd, pex_path]
    elif deploy_type == "source":
        kolibri_cmd = ["kolibri"]
    return kolibri_cmd


if __name__ == "__main__":
    set_default_envs()
    envs = os.environ
    if envs["DEPLOY_TYPE"] == "pex":
        copy_pex_file_to_kolibrihome()
    CMD = sys.argv[1:]  # get the docker CMD passed in, striping out entrypoint
    kolibri_cmd = get_kolibri_cmd(CMD)
    #
    # KOLIBRI SETUP AUTOMATION OPTIONAL TASKS ##################################
    if "KOLIBRI_PROVISIONDEVICE_FACILITY" in envs:
        create_facility(kolibri_cmd)
    if "KOLIBRI_CHANNELS_TO_IMPORT" in envs:
        import_channels(kolibri_cmd)
    set_default_language(kolibri_cmd)
    # TODO: generateuserdata?
    # TODO: load entire /kolibrihome?
    # TODO: load fixtures --- loaddata json and/or SQL?
    #
    # ASSUMPTION: first element of CMD is always specified as ['kolibri', ...]
    # even when we want to run a pex file, so in that case we need to edit CMD:
    if len(kolibri_cmd) > 1 and CMD[0] == "kolibri":
        # replace ['kolibri' with ['python', '/path/to/some.pex' if needed
        run_cmd = kolibri_cmd + CMD[1:]
    else:
        # otherwise send CMD straight through like a good docker entryptoint...
        run_cmd = CMD[:]
    # Do it!
    run_kolibri(run_cmd)
