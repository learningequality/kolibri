"""
This module is intended to allow easier build time configuration of Kolibri.
This is currently implemented by allowing additional build configuration options to be configured
through environment variables.
In order for these environment variables to propagate through to our docker build environment
we dynamically add them to the env.list file in the root of the repository.
All the environment variables should be prefixed with KOLIBRI_BUILD_ in the current environment,
and will be passed into the docker environment without the prefix by running the
customize_docker_envlist.py script.
The following environment variables are supported:

BUILD_TIME_PLUGINS, a txt file containing an explicit list of all Kolibri plugins that should
have their Javascript assets built. This allows for the building of external plugins that are not
published anywhere in a state where their frontend assets are precompiled, and also for plugins
that define a modification to the Javascript core API specification (such as applying custom
styling, or substituting new versions of core components) - we define this differently from
the following variable mainly for this reason - that we may want to modify the build time assets,
but no longer need that plugin in production.

RUN_TIME_PLUGINS, a txt file containing an explicit list of all Kolibri plugins that should be
enabled by default when Kolibri runs. These plugins will be automatically enabled when Kolibri
first runs, and also will be activated if a version change is detected.

DEFAULT_SETTINGS_MODULE, a Python module path to a settings file that will be used by default at
load time.

These three environment variables are used in the customize_build.py script.

EXTRA_REQUIREMENTS, a txt file of additional requirements. These requirements will be added to
the base requirements for Kolibri and bundled into the built dist folder. In the case of any
unbuilt external Kolibri plugins, this should be a URL to a pip compatible source bundle.

This environment variable is used in the customize_requirements.py script.

For BUILD_TIME_PLUGINS, RUN_TIME_PLUGINS, and EXTRA_REQUIREMENTS if the environment variable
specifies a URL, the scripts will attempt to download a text file from that URL and then use
that file.
"""
