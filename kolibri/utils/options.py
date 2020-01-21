import logging.config
import os
import sys

from configobj import ConfigObj
from configobj import flatten_errors
from configobj import get_extra_values
from django.utils.functional import SimpleLazyObject
from validate import Validator

try:
    import kolibri.utils.pskolibri as psutil
except NotImplementedError:
    # This module can't work on this OS
    psutil = None


from kolibri.utils.logger import get_base_logging_config
from kolibri.plugins.utils.options import extend_config_spec


def calculate_thread_pool():
    """
    Returns the default value for CherryPY thread_pool:
    - calculated based on the best values obtained in several partners installations
    - value must be between 10 (default CherryPy value) and 200
    - servers with more memory can deal with more threads
    - calculations are done for servers with more than 2 Gb of RAM
    """
    MIN_POOL = 50
    MAX_POOL = 150
    if psutil:
        MIN_MEM = 2
        MAX_MEM = 6
        total_memory = psutil.virtual_memory().total / pow(2, 30)  # in Gb
        # if it's in the range, scale thread count linearly with available memory
        if MIN_MEM < total_memory < MAX_MEM:
            return MIN_POOL + int(
                (MAX_POOL - MIN_POOL)
                * float(total_memory - MIN_MEM)
                / (MAX_MEM - MIN_MEM)
            )
        # otherwise return either the min or max amount
        return MAX_POOL if total_memory >= MAX_MEM else MIN_POOL
    elif sys.platform.startswith(
        "darwin"
    ):  # Considering MacOS has at least 4 Gb of RAM
        return MAX_POOL
    return MIN_POOL


base_option_spec = {
    "Cache": {
        "CACHE_BACKEND": {
            "type": "option",
            "options": ("memory", "redis"),
            "default": "memory",
            "envvars": ("KOLIBRI_CACHE_BACKEND",),
        },
        "CACHE_TIMEOUT": {
            "type": "integer",
            "default": 300,
            "envvars": ("KOLIBRI_CACHE_TIMEOUT",),
        },
        "CACHE_MAX_ENTRIES": {
            "type": "integer",
            "default": 1000,
            "envvars": ("KOLIBRI_CACHE_MAX_ENTRIES",),
        },
        "CACHE_PASSWORD": {
            "type": "string",
            "default": "",
            "envvars": ("KOLIBRI_CACHE_PASSWORD",),
        },
        "CACHE_LOCATION": {
            "type": "string",
            "default": "localhost:6379",
            "envvars": ("KOLIBRI_CACHE_LOCATION",),
        },
        "CACHE_REDIS_MIN_DB": {
            "type": "integer",
            "default": 0,
            "envvars": ("KOLIBRI_CACHE_REDIS_MIN_DB",),
        },
    },
    "Database": {
        "DATABASE_ENGINE": {
            "type": "option",
            "options": ("sqlite", "postgres"),
            "default": "sqlite",
            "envvars": ("KOLIBRI_DATABASE_ENGINE",),
        },
        "DATABASE_NAME": {"type": "string", "envvars": ("KOLIBRI_DATABASE_NAME",)},
        "DATABASE_PASSWORD": {
            "type": "string",
            "envvars": ("KOLIBRI_DATABASE_PASSWORD",),
        },
        "DATABASE_USER": {"type": "string", "envvars": ("KOLIBRI_DATABASE_USER",)},
        "DATABASE_HOST": {"type": "string", "envvars": ("KOLIBRI_DATABASE_HOST",)},
        "DATABASE_PORT": {"type": "string", "envvars": ("KOLIBRI_DATABASE_PORT",)},
    },
    "Server": {
        "CHERRYPY_START": {
            "type": "boolean",
            "default": True,
            "envvars": ("KOLIBRI_CHERRYPY_START",),
        },
        "CHERRYPY_THREAD_POOL": {
            "type": "integer",
            "default": calculate_thread_pool(),
            "envvars": ("KOLIBRI_CHERRYPY_THREAD_POOL",),
        },
        "CHERRYPY_SOCKET_TIMEOUT": {
            "type": "integer",
            "default": 10,
            "envvars": ("KOLIBRI_CHERRYPY_SOCKET_TIMEOUT",),
        },
        "CHERRYPY_QUEUE_SIZE": {
            "type": "integer",
            "default": 30,
            "envvars": ("KOLIBRI_CHERRYPY_QUEUE_SIZE",),
        },
        "CHERRYPY_QUEUE_TIMEOUT": {
            "type": "float",
            "default": 0.1,
            "envvars": ("KOLIBRI_CHERRYPY_QUEUE_TIMEOUT",),
        },
        "PROFILE": {
            "type": "boolean",
            "default": False,
            "envvars": ("KOLIBRI_SERVER_PROFILE",),
        },
    },
    "Paths": {
        "CONTENT_DIR": {
            "type": "string",
            "default": "content",
            "envvars": ("KOLIBRI_CONTENT_DIR",),
        }
    },
    "Urls": {
        "CENTRAL_CONTENT_BASE_URL": {
            "type": "string",
            "default": "https://studio.learningequality.org",
            "envvars": (
                "KOLIBRI_CENTRAL_CONTENT_BASE_URL",
                "CENTRAL_CONTENT_DOWNLOAD_BASE_URL",
            ),
        },
        "DATA_PORTAL_SYNCING_BASE_URL": {
            "type": "string",
            "default": "https://kolibridataportal.learningequality.org",
            "envvars": ("KOLIBRI_DATA_PORTAL_SYNCING_BASE_URL",),
        },
    },
    "Deployment": {
        "HTTP_PORT": {
            "type": "integer",
            "default": 8080,
            "envvars": ("KOLIBRI_HTTP_PORT", "KOLIBRI_LISTEN_PORT"),
        },
        "RUN_MODE": {"type": "string", "envvars": ("KOLIBRI_RUN_MODE",)},
        "URL_PATH_PREFIX": {
            "type": "string",
            "default": "/",
            "envvars": ("KOLIBRI_URL_PATH_PREFIX",),
            "clean": lambda x: x.lstrip("/").rstrip("/") + "/",
        },
    },
    "Python": {
        "PICKLE_PROTOCOL": {
            "type": "integer",
            "default": 2,
            "envvars": ("KOLIBRI_PICKLE_PROTOCOL",),
        },
    },
}


def get_logger(KOLIBRI_HOME):
    """
    We define a minimal default logger config here, since we can't yet load up Django settings.
    """
    from kolibri.utils.conf import LOG_ROOT

    logging.config.dictConfig(get_base_logging_config(LOG_ROOT))
    return logging.getLogger(__name__)


def __get_option_spec():
    """
    Combine the default option spec with any options that are defined in plugins
    """
    return extend_config_spec(base_option_spec)


option_spec = SimpleLazyObject(__get_option_spec)


def get_configspec():
    """
    Read the option_spec dict defined above, and turn it into a "configspec" object (per the configobj library)
    so that we can use it to parse the options.ini file.
    """

    lines = []

    for section, opts in option_spec.items():
        lines.append("[{section}]".format(section=section))
        for name, attrs in opts.items():
            default = attrs.get("default", "")
            the_type = attrs["type"]
            args = ["%r" % op for op in attrs.get("options", [])] + [
                "default='{default}'".format(default=default)
            ]
            line = "{name} = {type}({args})".format(
                name=name, type=the_type, args=", ".join(args)
            )
            lines.append(line)

    return ConfigObj(lines, _inspec=True)


def clean_conf(conf):
    # override any values from their environment variables (if set)
    for section, opts in option_spec.items():
        for optname, attrs in opts.items():
            # if any options have clean functions defined, then apply them now
            if "clean" in attrs:
                conf[section][optname] = attrs["clean"](conf[section][optname])
    return conf


def read_options_file(KOLIBRI_HOME, ini_filename="options.ini"):

    logger = get_logger(KOLIBRI_HOME)

    ini_path = os.path.join(KOLIBRI_HOME, ini_filename)

    conf = ConfigObj(ini_path, configspec=get_configspec())

    # validate once up front to ensure section structure is in place
    conf.validate(Validator())

    # keep track of which options were overridden using environment variables, to support error reporting
    using_env_vars = {}

    # override any values from their environment variables (if set)
    for section, opts in option_spec.items():
        for optname, attrs in opts.items():
            for envvar in attrs.get("envvars", []):
                if os.environ.get(envvar):
                    logger.info(
                        "Option {optname} in section [{section}] being overridden by environment variable {envvar}".format(
                            optname=optname, section=section, envvar=envvar
                        )
                    )
                    conf[section][optname] = os.environ[envvar]
                    using_env_vars[optname] = envvar
                    break

    conf = clean_conf(conf)

    validation = conf.validate(Validator(), preserve_errors=True)

    # loop over and display any errors with config values, and then bail
    if validation is not True:
        for section_list, optname, error in flatten_errors(conf, validation):
            section = section_list[0]
            if optname in using_env_vars:
                logger.error(
                    "Error processing environment variable option {envvar}: {error}".format(
                        envvar=using_env_vars[optname], error=error
                    )
                )
            else:
                logger.error(
                    "Error processing {file} under section [{section}] for option {option}: {error}".format(
                        file=ini_path, section=section, option=optname, error=error
                    )
                )
        logger.critical(
            "Aborting: Could not process options config (see errors above for more details)"
        )
        raise SystemExit(1)

    # loop over any extraneous options and warn the user that we're ignoring them
    for sections, name in get_extra_values(conf):

        # this code gets the extra values themselves
        the_section = conf
        for section in sections:
            the_section = the_section[section]

        # the_value may be a section or a value
        the_value = the_section.pop(name)

        # determine whether the extra item is a section (dict) or value
        kind = "section" if isinstance(the_value, dict) else "option"

        logger.warn(
            "Ignoring unknown {kind} in options file {file} under {section}: {name}.".format(
                kind=kind,
                file=ini_path,
                section=sections[0] if sections else "top level",
                name=name,
            )
        )

    # run validation once again to fill in any default values for options we deleted due to issues
    conf.validate(Validator())

    # ensure all arguments under section "Paths" are fully resolved and expanded, relative to KOLIBRI_HOME
    _expand_paths(KOLIBRI_HOME, conf.get("Paths", {}))

    return conf


def _expand_paths(basepath, pathdict):
    """
    Resolve all paths in a dict, relative to a base path, and after expanding "~" into the user's home directory.
    """
    for key, path in pathdict.items():
        pathdict[key] = os.path.join(basepath, os.path.expanduser(path))


def update_options_file(section, key, value, KOLIBRI_HOME, ini_filename="options.ini"):

    logger = get_logger(KOLIBRI_HOME)

    # load the current conf from disk into memory
    conf = read_options_file(KOLIBRI_HOME, ini_filename=ini_filename)

    # update the requested option value
    conf[section][key] = value

    # check for any errors with the provided value, and abort
    validation = conf.validate(Validator(), preserve_errors=True)
    if validation is not True:
        error = validation.get(section, {}).get(key) or "unknown error"
        raise ValueError(
            "Unable to set {key} in {file}: {error}".format(
                key=key, file=ini_filename, error=error
            )
        )

    # write the settings file back to disk
    conf.write()

    logger.warning(
        "Options file {file} has been updated; server restart is required before change will take effect.".format(
            file=conf.filename
        )
    )
