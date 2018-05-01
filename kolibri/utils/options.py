import logging
import os

from configobj import ConfigObj
from configobj import flatten_errors
from configobj import get_extra_values
from validate import Validator


logger = logging.getLogger(__name__)

ini_specification = [

    "[Database]",
    "DATABASE_ENGINE = option('sqlite', 'postgres', default='sqlite')",
    "DATABASE_NAME = string(default='')",
    "DATABASE_PASSWORD = string(default='')",
    "DATABASE_USER = string(default='')",
    "DATABASE_HOST = string(default='localhost')",

    "[Paths]",  # these are defined relative to KOLIBRI_HOME (or absolute)
    "CONTENT_ROOT = string(default=content)",

    "[Deployment]",
    "LISTEN_PORT = integer(default=8080)",

]

def get_option_name_list():

    configspec = ConfigObj(ini_specification, _inspec=True)

    option_names = []

    for section in configspec.sections:
        option_names += configspec[section].keys()

    return option_names


def read_options_file(ini_path):

    ini_path = os.path.realpath(ini_path)

    configspec = ConfigObj(ini_specification, _inspec=True)

    conf = ConfigObj(ini_path, configspec=configspec, write_empty_values=True)

    validation = conf.validate(Validator(), preserve_errors=True)

    # loop over any errors with config values, and clean up
    for section_list, key, error in flatten_errors(conf, validation):
        if error is False:
            error = 'missing value or section.'
        if key is not None:
            # remove the value that didn't validate, to ignore it (rather than bailing)
            del conf[section_list[0]][key]
        logger.error("Skipping line in {file} under section [{section}] for option {option}: {error}"
                     .format(file=ini_path, section=section_list[0], option=key, error=error))

    # loop over any extraneous options and warn the user that we're ignoring them
    for sections, name in get_extra_values(conf):

        # this code gets the extra values themselves
        the_section = conf
        for section in sections:
            the_section = the_section[section]

        # the_value may be a section or a value
        the_value = the_section.pop(name)

        # determine whether the extra item is a section (dict) or value
        kind = 'section' if isinstance(the_value, dict) else 'option'

        logger.warn("Ignoring unknown {kind} in {file} under {section_string}: {name}."
                    .format(kind=kind, file=ini_path, section_string=' > '.join(sections) or "top level", name=name))

    # run validation once again to fill in any default values for options we deleted due to issues
    conf.validate(Validator())

    return conf


def update_env_from_options_file(ini_path):

    conf = read_options_file(ini_path)

    for section in conf.sections:
        for key, val in conf[section].items():
            # read each setting into environment variable, prefixed with KOLIBRI_, if not already defined
            os.environ.setdefault("KOLIBRI_{key}".format(key=key), str(val))


def get_options_from_env():

    options = {}

    for key in get_option_name_list():
        envkey = "KOLIBRI_{key}".format(key=key)
        if envkey in os.environ:
            options[key] = os.environ[envkey]

    return options
