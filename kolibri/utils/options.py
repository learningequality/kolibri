"""
This module is intended to allow customization of Kolibri settings with the
options.ini file.
The settings can be changed through environment variables or sections and keys
in the options.ini file.
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


from kolibri.utils.data import bytes_from_humans
from kolibri.utils.i18n import KOLIBRI_LANGUAGE_INFO
from kolibri.utils.i18n import KOLIBRI_SUPPORTED_LANGUAGES
from kolibri.plugins.utils.options import extend_config_spec
from kolibri.deployment.default.sqlite_db_names import (
    ADDITIONAL_SQLITE_DATABASES,
)
from kolibri.utils.system import get_fd_limit


CACHE_SHARDS = 8

# file descriptors per thread
FD_PER_THREAD = sum(
    (
        5,  # minimum allowance
        1 + len(ADDITIONAL_SQLITE_DATABASES),  # DBs assuming SQLite
        CACHE_SHARDS,  # assuming diskcache
    )
)


def calculate_thread_pool():
    """
    Returns the default value for CherryPY thread_pool:
    - calculated based on the best values obtained in several partners installations
    - servers with more memory can deal with more threads
    - calculations are done for servers with more than 2 Gb of RAM
    - restricts value to avoid exceeding file descriptor limit
    """
    MIN_POOL = 50
    MAX_POOL = 150

    pool_size = MIN_POOL
    if psutil:
        MIN_MEM = 2
        MAX_MEM = 6
        total_memory = psutil.virtual_memory().total / pow(10, 9)  # in GB
        # if it's in the range, scale thread count linearly with available memory
        if MIN_MEM < total_memory < MAX_MEM:
            pool_size = MIN_POOL + int(
                (MAX_POOL - MIN_POOL)
                * float(total_memory - MIN_MEM)
                / (MAX_MEM - MIN_MEM)
            )
        elif total_memory >= MAX_MEM:
            pool_size = MAX_POOL
    elif sys.platform.startswith(
        "darwin"
    ):  # Considering MacOS has at least 4 Gb of RAM
        pool_size = MAX_POOL

    # ensure (number of threads) x (open file descriptors) < (fd limit)
    max_threads = get_fd_limit() // FD_PER_THREAD
    return min(pool_size, max_threads)


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
    # Allow for blank paths
    if value:
        # ensure all path arguments, e.g. under section "Paths", are fully resolved and expanded, relative to KOLIBRI_HOME
        return os.path.join(KOLIBRI_HOME, os.path.expanduser(value))
    return value


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


def validate_bytes(value):
    try:
        value = bytes_from_humans(value)
    except ValueError:
        raise VdtValueError(value)
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
            "description": """
                Which backend to use for the main cache - if 'memory' is selected, then for most cache operations,
                an in-memory, process-local cache will be used, but a disk based cache will be used for some data
                that needs to be persistent across processes. If 'redis' is used, it is used for all caches.
            """,
        },
        "CACHE_TIMEOUT": {
            "type": "integer",
            "default": 300,
            "description": "Default timeout for entries put into the cache.",
        },
        "CACHE_MAX_ENTRIES": {
            "type": "integer",
            "default": 1000,
            "description": "Maximum number of entries to maintain in the cache at once.",
        },
        "CACHE_PASSWORD": {
            "type": "string",
            "default": "",
            "description": "Password to authenticate to Redis, Redis only.",
        },
        "CACHE_LOCATION": {
            "type": "string",
            "default": "localhost:6379",
            "description": "Host and port at which to connect to Redis, Redis only.",
        },
        "CACHE_REDIS_DB": {
            "type": "integer",
            "default": 0,
            "description": "The database number for Redis.",
            "deprecated_aliases": ("CACHE_REDIS_MIN_DB",),
        },
        "CACHE_REDIS_MAX_POOL_SIZE": {
            "type": "integer",
            "default": 50,  # use redis-benchmark to determine better value
            "description": "Maximum number of simultaneous connections to allow to Redis, Redis only.",
        },
        "CACHE_REDIS_POOL_TIMEOUT": {
            "type": "integer",
            "default": 30,  # seconds
            "description": "How long to wait when trying to connect to Redis before timing out, Redis only.",
        },
        # Optional redis settings to overwrite redis.conf
        "CACHE_REDIS_MAXMEMORY": {
            "type": "integer",
            "default": 0,
            "description": "Maximum memory that Redis should use, Redis only.",
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
            "description": "Eviction policy to use when using Redis for caching, Redis only.",
        },
    },
    "Database": {
        "DATABASE_ENGINE": {
            "type": "option",
            "options": ("sqlite", "postgres"),
            "default": "sqlite",
            "description": "Which database backend to use, choices are 'sqlite' or 'postgresql'",
        },
        "DATABASE_NAME": {
            "type": "string",
            "description": """
                For SQLite - the name of a database file to use for the main Kolibri database.
                For Postgresql, the name of the database to use for all Kolibri data.
            """,
        },
        "DATABASE_PASSWORD": {
            "type": "string",
            "description": "The password to authenticate with when connecting to the database, Postgresql only.",
        },
        "DATABASE_USER": {
            "type": "string",
            "description": "The user to authenticate with when connecting to the database, Postgresql only.",
        },
        "DATABASE_HOST": {
            "type": "string",
            "description": "The host on which to connect to the database, Postgresql only.",
        },
        "DATABASE_PORT": {
            "type": "string",
            "description": "The port on which to connect to the database, Postgresql only.",
        },
    },
    "Server": {
        "CHERRYPY_START": {
            "type": "boolean",
            "default": True,
            "description": "DEPRECATED - do not use this option, use the 'kolibri services' command instead.",
            "deprecated": True,
        },
        "CHERRYPY_THREAD_POOL": {
            "type": "integer",
            "default": calculate_thread_pool(),
            "description": "How many threads the Kolibri server should use to serve requests",
        },
        "CHERRYPY_SOCKET_TIMEOUT": {
            "type": "integer",
            "default": 10,
            "description": """
                How long a socket should wait for data flow to resume before
                it considers that the connection has been interrupted.
                Increasing this may help in situations where there is high
                latency on a network or the bandwidth is bursty, with some
                expected data flow interruptions which may not be indicative of the connection failing.
            """,
        },
        "CHERRYPY_QUEUE_SIZE": {
            "type": "integer",
            "default": 30,
            "description": """
                How many requests to allow in the queue.
                Increasing this may help situations where requests are instantly refused by the server.
            """,
        },
        "CHERRYPY_QUEUE_TIMEOUT": {
            "type": "float",
            "default": 0.1,
            "description": """
                How many seconds to wait for a request to be put into the queue.
                Increasing this may help situations where requests are instantly refused by the server.
            """,
        },
        "PROFILE": {
            "type": "boolean",
            "default": False,
            "envvars": ("KOLIBRI_SERVER_PROFILE",),
            "description": "Activate the server profiling middleware.",
        },
        "DEBUG": {
            "type": "boolean",
            "default": False,
            "description": "Run Kolibri with Django setting DEBUG = True",
        },
        "DEBUG_LOG_DATABASE": {
            "type": "boolean",
            "default": False,
            "description": "Activate debug logging for Django ORM operations.",
        },
    },
    "Paths": {
        "CONTENT_DIR": {
            "type": "path",
            "default": "content",
            "description": """
                The directory that will store content files and content database files.
                To change this in a currently active server it is recommended to use the
                'content movedirectory' management command.
            """,
        },
        "CONTENT_FALLBACK_DIRS": {
            "type": "path_list",
            "default": "",
            "description": "Additional directories in which Kolibri will look for content files and content database files.",
        },
        "AUTOMATIC_PROVISION_FILE": {
            "type": "path",
            "default": "",
            "description": "The file that contains the automatic device provisioning data.",
        },
    },
    "Urls": {
        "CENTRAL_CONTENT_BASE_URL": {
            "type": "string",
            "default": "https://studio.learningequality.org",
            "deprecated_envvars": ("CENTRAL_CONTENT_DOWNLOAD_BASE_URL",),
            "description": """
                URL to use as the default source for content import.
                Slightly counterintuitively this will still be displayed in the UI as 'import from Kolibri Studio'.
            """,
        },
        "DATA_PORTAL_SYNCING_BASE_URL": {
            "type": "string",
            "default": "https://kolibridataportal.learningequality.org",
            "description": "URL to use as the target for data portal syncing.",
        },
    },
    "Deployment": {
        "HTTP_PORT": {
            "type": "port",
            "default": 8080,
            "deprecated_envvars": ("KOLIBRI_LISTEN_PORT",),
            "description": "Sets the port that Kolibri will serve on. This can be further overridden by command line arguments.",
        },
        "RUN_MODE": {
            "type": "string",
            "description": "Used to flag non-user Kolibri instances",
            "skip_blank": True,
        },
        "DISABLE_PING": {
            "type": "boolean",
            "default": False,
            "description": "Turn off the statistics pingback. This will also disable update notifications",
        },
        "URL_PATH_PREFIX": {
            "type": "url_prefix",
            "default": "/",
            "description": """
                Serve Kolibri from a subpath under the main domain. Used when serving multiple applications from
                the same origin. This option is not heavily tested, but is provided for user convenience.
            """,
        },
        "LANGUAGES": {
            "type": "language_list",
            "default": SUPPORTED_LANGUAGES,
            "description": """
                The user interface languages to enable on this instance of Kolibri (has no effect on languages of imported content channels).
                The default will include all the languages Kolibri supports.
            """,
        },
        "ZIP_CONTENT_ORIGIN": {
            "type": "origin_or_port",
            "default": "",
            "description": """
                When running by default (value blank), Kolibri frontend looks for the zipcontent endpoints
                on the same domain as Kolibri proper, but uses ZIP_CONTENT_PORT instead of HTTP_PORT.
                When running behind a proxy, set the value to the port where zipcontent endpoint is served on,
                and it will be substituted for the port that Kolibri proper is being served on.
                When zipcontent is being served from a completely separate domain, you can set an
                absolute origin (full protocol plus domain, e.g. 'https://myzipcontent.com/')
                to be used for all zipcontent origin requests.
            """,
        },
        "ZIP_CONTENT_PORT": {
            "type": "port",
            "default": 0,
            "description": """
                Sets the port that Kolibri will serve the alternate origin server on. This is the server that
                is used to serve all content for the zipcontent endpoint, so as to provide safe IFrame sandboxing
                but avoiding issues with null origins.
                This is the alternate origin server equivalent of HTTP_PORT.
            """,
        },
        "ZIP_CONTENT_URL_PATH_PREFIX": {
            "type": "url_prefix",
            "default": "/",
            "description": """
                The zip content equivalent of URL_PATH_PREFIX - allows all zip content URLs to be prefixed with
                a fixed path. This both changes the URL from which the endpoints are served by the alternate
                origin server, and the URL prefix where the Kolibri frontend looks for it.
                In the case that ZIP_CONTENT_ORIGIN is pointing to an entirely separate origin, this setting
                can still be used to set a URL prefix that the frontend of Kolibri will look to when
                retrieving alternate origin URLs.
            """,
        },
        "REMOTE_CONTENT": {
            "type": "boolean",
            "default": False,
            "description": """
                Boolean flag that causes content import processes to skip trying to import any
                content, as it is assumed that the remote source has everything available.
                Server configuration should handle ensuring that the files are properly served.
            """,
        },
        "SYNC_INTERVAL": {
            "type": "integer",
            "default": 60,
            "description": """
                In case a SoUD connects to this server, the SoUD should use this interval to resync every user.
            """,
        },
        "PROJECT": {
            "type": "string",
            "skip_blank": True,
            "description": """
                The custom identifier for a project. This is used to identify the project in the telemetry
                data that is returned to our telemetry server.
            """,
        },
        "MINIMUM_DISK_SPACE": {
            "type": "bytes",
            "default": "250MB",
            "description": """
                The minimum free disk space that Kolibri should try to maintain on the device. This will
                be used as the floor value to prevent Kolibri completely filling the disk during file import.
                Value can either be a number suffixed with a unit (e.g. MB, GB, TB) or an integer number of bytes.
            """,
        },
    },
    "Python": {
        "PICKLE_PROTOCOL": {
            "type": "integer",
            "default": 2,
            "description": """
                Which Python pickle protocol to use. Pinned to 2 for now to provide maximal cross-Python version compatibility.
                Can safely be set to a higher value for deployments that will never change Python versions.
            """,
        }
    },
    "Tasks": {
        "USE_WORKER_MULTIPROCESSING": {
            "type": "boolean",
            "default": False,
            "description": """
                Whether to use Python multiprocessing for worker pools. If False, then it will use threading. This may be useful,
                if running on a dedicated device with multiple cores, and a lot of asynchronous tasks get run.
            """,
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
            "bytes": validate_bytes,
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
            if "deprecated_aliases" in attrs:
                attrs["deprecated_envvars"] = attrs.get("deprecated_envvars", ())
                for alias in attrs["deprecated_aliases"]:
                    alias_ev = "KOLIBRI_{}".format(alias)
                    if alias_ev not in envvars:
                        attrs["deprecated_envvars"] += (alias_ev,)

            opt_envvars = attrs.get("envvars", ()) + attrs.get("deprecated_envvars", ())
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
                attrs["envvars"] = (default_envvar,) + opt_envvars
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


def _set_from_envvars(conf):
    """
    Set the configuration from environment variables.
    """
    logger = _get_logger()
    # keep track of which options were overridden using environment variables, to support error reporting
    using_env_vars = {}

    deprecation_warning = "Option {optname} in section [{section}] being overridden by deprecated environment variable {envvar}, please update to: {envvars}"
    # override any values from their environment variables (if set)
    # and check for use of deprecated environment variables and options
    for section, opts in option_spec.items():
        for optname, attrs in opts.items():
            for envvar in attrs.get("envvars", []):
                if os.environ.get(envvar):
                    deprecated_envvars = attrs.get("deprecated_envvars", ())
                    if envvar in deprecated_envvars:
                        logger.warn(
                            deprecation_warning.format(
                                optname=optname,
                                section=section,
                                envvar=envvar,
                                envvars=", ".join(
                                    e
                                    for e in attrs.get("envvars", [])
                                    if e not in deprecated_envvars
                                ),
                            )
                        )
                    else:
                        logger.info(
                            "Option {optname} in section [{section}] being overridden by environment variable {envvar}".format(
                                optname=optname, section=section, envvar=envvar
                            )
                        )
                    if attrs.get("deprecated", False):
                        logger.warn(
                            "Option {optname} in section [{section}] is deprecated, please remove it from your options.ini file".format(
                                optname=optname, section=section
                            )
                        )
                    conf[section][optname] = os.environ[envvar]
                    using_env_vars[optname] = envvar
                    break
    return using_env_vars


def _set_from_deprecated_aliases(conf):
    """
    Set the configuration from deprecated aliases.
    """
    logger = _get_logger()
    # keep track of which options were overridden using environment variables, to support error reporting
    using_deprecated_alias = {}

    deprecation_warning = "Option {optname} in section [{section}] being set by deprecated alias {alias}, please update to: {optname}"
    # override any values from their environment variables (if set)
    # and check for use of deprecated environment variables and options
    for section, opts in option_spec.items():
        for optname, attrs in opts.items():
            for alias in attrs.get("deprecated_aliases", ()):
                if alias in conf[section]:
                    logger.warn(
                        deprecation_warning.format(
                            optname=optname,
                            section=section,
                            alias=alias,
                        )
                    )
                    conf[section][optname] = conf[section][alias]
                    del conf[section][alias]
                    using_deprecated_alias[optname] = alias
                    break
    return using_deprecated_alias


def read_options_file(ini_filename="options.ini"):

    from kolibri.utils.conf import KOLIBRI_HOME

    logger = _get_logger()

    ini_path = os.path.join(KOLIBRI_HOME, ini_filename)

    conf = ConfigObj(ini_path, configspec=get_configspec())

    # Check for use of deprecated options
    for section, opts in option_spec.items():
        for optname, attrs in opts.items():
            if (
                attrs.get("deprecated", False)
                and section in conf
                and optname in conf[section]
            ):
                logger.warn(
                    "Option {optname} in section [{section}] is deprecated, please remove it from your options.ini file".format(
                        optname=optname, section=section
                    )
                )

    # validate once up front to ensure section structure is in place
    conf.validate(_get_validator())

    using_env_vars = _set_from_envvars(conf)

    using_deprecated_alias = _set_from_deprecated_aliases(conf)

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
            elif optname in using_deprecated_alias:
                logger.error(
                    "Error processing {file} under section [{section}] for option {alias}: {error}".format(
                        file=ini_path,
                        section=section,
                        alias=using_deprecated_alias[optname],
                        error=error,
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


def generate_empty_options_file(ini_filename="options.ini"):
    # Generate an options.ini file inside the KOLIBRI_HOME as default placeholder config

    conf = read_options_file(ini_filename=ini_filename)

    comments = None

    for section, opts in option_spec.items():
        if comments is not None:
            conf.comments[section] = comments
        comments = []
        for optname, attrs in opts.items():
            if not attrs.get("skip_blank", False) and not attrs.get(
                "deprecated", False
            ):
                if "description" in attrs:
                    comments.extend(attrs["description"].strip().split("\n"))
                comments.append("{} = {}".format(optname, attrs.get("default", "")))
                comments.append("")
    conf.final_comment = comments

    conf.write()
