"""
This module is intended to allow customization of Kolibri settings with the
options.ini file.
The settings can be changed through environment variables or sections and keys
in the options.ini file.
The following options are supported:

[Cache]
CACHE_BACKEND
CACHE_TIMEOUT
CACHE_MAX_ENTRIES
CACHE_PASSWORD
CACHE_LOCATION
CACHE_LOCK_TTL
CACHE_REDIS_MIN_DB
CACHE_REDIS_MAX_POOL_SIZE
CACHE_REDIS_POOL_TIMEOUT
CACHE_REDIS_MAXMEMORY
CACHE_REDIS_MAXMEMORY_POLICY

[Database]
DATABASE_ENGINE
DATABASE_NAME
DATABASE_PASSWORD
DATABASE_USER
DATABASE_HOST
DATABASE_PORT

[Server]
CHERRYPY_START
CHERRYPY_THREAD_POOL
CHERRYPY_SOCKET_TIMEOUT
CHERRYPY_QUEUE_SIZE
CHERRYPY_QUEUE_TIMEOUT
PROFILE

[Paths]
CONTENT_DIR

[Urls]
CENTRAL_CONTENT_BASE_URL
DATA_PORTAL_SYNCING_BASE_URL

[Deployment]
HTTP_PORT
RUN_MODE
URL_PATH_PREFIX
    Serve Kolibri from a subpath under the main domain. Used when serving multiple applications from
    the same origin. This option is not heavily tested, but is provided for user convenience.
LANGUAGES
ZIP_CONTENT_URL_PATH_PREFIX
    The zip content equivalent of URL_PATH_PREFIX - allows all zip content URLs to be prefixed with
    a fixed path. This both changes the URL from which the endpoints are served by the alternate
    origin server, and the URL prefix where the Kolibri frontend looks for it.
    In the case that ZIP_CONTENT_ORIGIN is pointing to an entirely separate origin, this setting
    can still be used to set a URL prefix that the frontend of Kolibri will look to when
    retrieving alternate origin URLs.
ZIP_CONTENT_ORIGIN
    When running in default operation, this will default to blank, and the Kolibri
    frontend will look for the zipcontent endpoints on the same domain as Kolibri proper
    but using ZIP_CONTENT_PORT instead of HTTP_PORT.
    When running behind a proxy, this value should be set to the port that the zipcontent
    endpoint is being served on, this will be substituted for the port that Kolibri proper
    is being served on.
    If zipcontent is being served from a completely separate domain this can be the absolute
    origin (full protocol plus domain, e.g. 'https://myzipcontent.com/') which will then
    be used for all zipcontent origin requests.
ZIP_CONTENT_PORT
    Sets the port that Kolibri will serve the alternate origin server on. This is the alternate
    origin server equivalent of HTTP_PORT.

[Python]
PICKLE_PROTOCOL
"""
import logging.config
import os
import sys

from configobj import ConfigObj
from configobj import flatten_errors
from configobj import get_extra_values
from django.utils.functional import SimpleLazyObject
from django.utils.six import string_types
from six.moves.urllib.parse import urlparse
from six.moves.urllib.parse import urlunparse
from validate import Validator
from validate import VdtTypeError
from validate import VdtValueError

try:
    import kolibri.utils.pskolibri as psutil
except NotImplementedError:
    # This module can't work on this OS
    psutil = None


from kolibri.utils.i18n import KOLIBRI_LANGUAGE_INFO
from kolibri.utils.i18n import KOLIBRI_SUPPORTED_LANGUAGES
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


ALL_LANGUAGES = "kolibri-all"
SUPPORTED_LANGUAGES = "kolibri-supported"


def _process_language_string(value):
    """
    Used to validate string values.
    The only valid argument in this case is that it is a string
    so we first try to coerce it to a string, then do some checks
    to see if it is any of our special values. Then if it is an
    appropriate language code value.
    If no value is appropriate, raise a ValueError.
    """
    value = str(value)
    if value == ALL_LANGUAGES:
        return list(KOLIBRI_LANGUAGE_INFO.keys())
    if value == SUPPORTED_LANGUAGES:
        return list(KOLIBRI_SUPPORTED_LANGUAGES)
    if value in KOLIBRI_LANGUAGE_INFO:
        return [value]
    raise ValueError


def language_list(value):
    """
    Check that the supplied value is a list of languages,
    or a single language, or a special shortcut parameter.
    In the case that it is a special shortcut name, we return the full list
    of relevant languages for that parameter, or throw a validation error
    if that parameter would return an empty list.
    If a single language code is the parameter, this function will return a list
    with that language code as the only member.

    :param Union[str, list[str]] value: Either a string or a list of strings
    String can be any value that is a key of KOLIBRI_LANGUAGE_INFO
    or one of the special strings represented by ALL_LANGUAGES or SUPPORTED_LANGUAGES
    A list must be a list of these strings.
    """
    # Check the supplied value is a list
    if not isinstance(value, list):
        value = [value]

    out = set()
    errors = []
    for entry in value:
        try:
            entry_list = _process_language_string(entry)
            out.update(entry_list)
        except ValueError:
            errors.append(entry)
    if errors:
        raise VdtValueError(errors)

    if not out:
        raise VdtValueError(value)

    return sorted(list(out))


def path(value):
    from kolibri.utils.conf import KOLIBRI_HOME

    if not isinstance(value, string_types):
        raise VdtValueError(repr(value))
    # ensure all path arguments, e.g. under section "Paths", are fully resolved and expanded, relative to KOLIBRI_HOME
    return os.path.join(KOLIBRI_HOME, os.path.expanduser(value))


def path_list(value):
    """
    Check that the supplied value is a semicolon-delimited list of paths.
    Note: we do not guarantee that these paths all currently exist.
    """
    if isinstance(value, string_types):
        value = value.split(";")

    out = []

    if isinstance(value, list):
        errors = []
        for item in value:
            try:
                out.append(path(item))
            except VdtValueError:
                errors.append(repr(item))
        if errors:
            raise VdtValueError(errors)

    return out


def validate_port_number(value):
    if 0 <= value <= 65535:
        return value
    raise VdtValueError(value)


def port(value):
    try:
        return validate_port_number(int(value))
    except ValueError:
        raise VdtTypeError(value)


def origin_or_port(value):
    """
    Check that the passed value can either be coerced to an integer to supply
    a port, or is a valid origin string.

    :param Union[integer, str] value: Either an integer or a string
    """
    if value != "":
        try:
            value = validate_port_number(int(value))
        except ValueError:
            url = urlparse(value)
            if not url.scheme or not url.netloc:
                raise VdtValueError(value)
            value = urlunparse((url.scheme, url.netloc, "", "", "", ""))
    return value


def url_prefix(value):
    if not isinstance(value, string_types):
        raise VdtValueError(value)
    return value.lstrip("/").rstrip("/") + "/"


base_option_spec = {
    "Cache": {
        "CACHE_BACKEND": {
            "type": "option",
            "options": ("memory", "redis"),
            "default": "memory",
        },
        "CACHE_TIMEOUT": {
            "type": "integer",
            "default": 300,
        },
        "CACHE_MAX_ENTRIES": {
            "type": "integer",
            "default": 1000,
        },
        "CACHE_PASSWORD": {
            "type": "string",
            "default": "",
        },
        "CACHE_LOCATION": {
            "type": "string",
            "default": "localhost:6379",
        },
        "CACHE_LOCK_TTL": {
            "type": "integer",
            "default": 30,
        },
        "CACHE_REDIS_MIN_DB": {
            "type": "integer",
            "default": 0,
        },
        "CACHE_REDIS_MAX_POOL_SIZE": {
            "type": "integer",
            "default": 50,  # use redis-benchmark to determine better value
        },
        "CACHE_REDIS_POOL_TIMEOUT": {
            "type": "integer",
            "default": 30,  # seconds
        },
        # Optional redis settings to overwrite redis.conf
        "CACHE_REDIS_MAXMEMORY": {
            "type": "integer",
            "default": 0,
        },
        "CACHE_REDIS_MAXMEMORY_POLICY": {
            "type": "option",
            "options": (
                "",
                "allkeys-lru",
                "volatile-lru",
                "allkeys-random",
                "volatile-random",
                "volatile-ttl",
                "noeviction",
            ),
            "default": "",
        },
    },
    "Database": {
        "DATABASE_ENGINE": {
            "type": "option",
            "options": ("sqlite", "postgres"),
            "default": "sqlite",
        },
        "DATABASE_NAME": {"type": "string"},
        "DATABASE_PASSWORD": {
            "type": "string",
        },
        "DATABASE_USER": {"type": "string"},
        "DATABASE_HOST": {"type": "string"},
        "DATABASE_PORT": {"type": "string"},
    },
    "Server": {
        "CHERRYPY_START": {
            "type": "boolean",
            "default": True,
        },
        "CHERRYPY_THREAD_POOL": {
            "type": "integer",
            "default": calculate_thread_pool(),
        },
        "CHERRYPY_SOCKET_TIMEOUT": {
            "type": "integer",
            "default": 10,
        },
        "CHERRYPY_QUEUE_SIZE": {
            "type": "integer",
            "default": 30,
        },
        "CHERRYPY_QUEUE_TIMEOUT": {
            "type": "float",
            "default": 0.1,
        },
        "PROFILE": {
            "type": "boolean",
            "default": False,
            "envvars": ("KOLIBRI_SERVER_PROFILE",),
        },
        "DEBUG": {"type": "boolean", "default": False},
        "DEBUG_LOG_DATABASE": {
            "type": "boolean",
            "default": False,
        },
    },
    "Paths": {
        "CONTENT_DIR": {
            "type": "path",
            "default": "content",
        },
        "CONTENT_FALLBACK_DIRS": {
            "type": "path_list",
            "default": "",
        },
    },
    "Urls": {
        "CENTRAL_CONTENT_BASE_URL": {
            "type": "string",
            "default": "https://studio.learningequality.org",
            "envvars": ("CENTRAL_CONTENT_DOWNLOAD_BASE_URL",),
        },
        "DATA_PORTAL_SYNCING_BASE_URL": {
            "type": "string",
            "default": "https://kolibridataportal.learningequality.org",
        },
    },
    "Deployment": {
        "HTTP_PORT": {
            "type": "port",
            "default": 8080,
            "envvars": (
                "KOLIBRI_HTTP_PORT",
                "KOLIBRI_LISTEN_PORT",
            ),
        },
        "RUN_MODE": {"type": "string"},
        "DISABLE_PING": {
            "type": "boolean",
            "default": False,
        },
        "URL_PATH_PREFIX": {
            "type": "url_prefix",
            "default": "/",
        },
        "LANGUAGES": {
            "type": "language_list",
            "default": SUPPORTED_LANGUAGES,
        },
        "ZIP_CONTENT_ORIGIN": {
            "type": "origin_or_port",
            "default": "",
        },
        "ZIP_CONTENT_PORT": {
            "type": "port",
            "default": 0,
        },
        "ZIP_CONTENT_URL_PATH_PREFIX": {
            "type": "url_prefix",
            "default": "/",
        },
    },
    "Python": {
        "PICKLE_PROTOCOL": {
            "type": "integer",
            "default": 2,
        }
    },
}


def _get_validator():
    return Validator(
        {
            "language_list": language_list,
            "path": path,
            "path_list": path_list,
            "origin_or_port": origin_or_port,
            "port": port,
            "url_prefix": url_prefix,
        }
    )


def _get_logger():
    """
    We define a minimal default logger config here, since we can't yet
    load up Django settings.

    NB! Since logging can be defined by options, the logging from some
    of the functions in this module do not use fully customized logging.
    """
    from kolibri.utils.conf import LOG_ROOT
    from kolibri.utils.logger import get_default_logging_config

    logging.config.dictConfig(get_default_logging_config(LOG_ROOT))
    return logging.getLogger(__name__)


def _get_option_spec():
    """
    Combine the default option spec with any options that are defined in plugins
    """
    option_spec = extend_config_spec(base_option_spec)
    envvars = set()
    for section, opts in option_spec.items():
        for optname, attrs in opts.items():
            opt_envvars = attrs.get("envvars", tuple())
            default_envvar = "KOLIBRI_{}".format(optname.upper())
            if default_envvar not in envvars:
                envvars.add(default_envvar)
            else:
                logging.warn(
                    "Duplicate environment variable for options {}".format(
                        default_envvar
                    )
                )
                default_envvar = "KOLIBRI_{}_{}".format(
                    section.upper(), optname.upper()
                )
            if default_envvar not in opt_envvars:
                attrs["envvars"] = opt_envvars + (default_envvar,)
    return option_spec


option_spec = SimpleLazyObject(_get_option_spec)


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
                "default=list('{default_list}')".format(
                    default_list="','".join(default)
                )
                if isinstance(default, list)
                else "default='{default}'".format(default=default)
            ]
            line = "{name} = {type}({args})".format(
                name=name, type=the_type, args=", ".join(args)
            )
            lines.append(line)

    return ConfigObj(lines, _inspec=True)


def read_options_file(ini_filename="options.ini"):

    from kolibri.utils.conf import KOLIBRI_HOME

    logger = _get_logger()

    ini_path = os.path.join(KOLIBRI_HOME, ini_filename)

    conf = ConfigObj(ini_path, configspec=get_configspec())

    # validate once up front to ensure section structure is in place
    conf.validate(_get_validator())

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

    validation = conf.validate(_get_validator(), preserve_errors=True)

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
    conf.validate(_get_validator())

    return conf


def update_options_file(section, key, value, ini_filename="options.ini"):
    """
    Updates the configuration file on top of what is currently in the
    file.

    Note to future: Do not change the implementation to write the
    in-memory conf.OPTIONS as it can contain temporary in-memory values
    that are not intended to be stored.
    """

    logger = _get_logger()

    # load the current conf from disk into memory
    conf = read_options_file(ini_filename=ini_filename)

    # update the requested option value
    conf[section][key] = value

    # check for any errors with the provided value, and abort
    validation = conf.validate(_get_validator(), preserve_errors=True)
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


empty_options_excluded_key = ["Python"]


def generate_empty_options_file(options_path, options_data):

    # Generate an options.ini file inside the KOLIBRI_HOME as default placeholder config
    with open(options_path, "w") as file:
        keys = [k for k in options_data if k not in empty_options_excluded_key]
        for key in keys:
            file.write("# [{}] \n".format(key))
            child_keys = [
                k for k in options_data[key] if k not in empty_options_excluded_key
            ]
            for child_key in child_keys:
                file.write(
                    "# {} = {} \n".format(child_key, options_data[key][child_key])
                )

            file.write("\n")
