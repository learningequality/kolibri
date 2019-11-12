# -*- coding: utf-8 -*-
#
# Kolibri 'developer docs' build configuration file
#
# This file is execfile()d with the current directory set to its containing dir.
import inspect
import os
import sys
from datetime import datetime

import django
from django.utils.encoding import force_text
from django.utils.html import strip_tags

# If extensions (or modules to document with autodoc) are in another directory,
# add these directories to sys.path here. If the directory is relative to the
# documentation root, use os.path.abspath to make it absolute, like shown here.
cwd = os.getcwd()
parent = os.path.dirname(cwd)
sys.path.insert(0, os.path.abspath(parent))


builddir = os.path.join(cwd, "_build")

# When we start loading stuff from kolibri, we're gonna need this
os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE", "kolibri.deployment.default.settings.base"
)
os.environ["KOLIBRI_HOME"] = os.path.join(builddir, "kolibri_home")

# This is necessary because the directory needs to exist for Kolibri to run when
# not invoked through CLI.
if not os.path.exists(os.environ["KOLIBRI_HOME"]):
    os.makedirs(os.environ["KOLIBRI_HOME"])

# This import *must* come after the path insertion, otherwise sphinx won't be able to find the kolibri module
import kolibri  # noqa


django.setup()


# Monkey patch this so we don't have any complaints during Sphinx inspect
from django.db.models.fields import files  # noqa

files.FileDescriptor.__get__ = lambda *args: None


# Auto list fields from django models - from https://djangosnippets.org/snippets/2533/#c5977
def process_docstring(app, what, name, obj, options, lines):
    # This causes import errors if left outside the function
    from django.db import models

    # Only look at objects that inherit from Django's base model class
    if inspect.isclass(obj) and issubclass(obj, models.Model):
        # Grab the field list from the meta class
        fields = obj._meta.get_fields()

        for field in fields:
            # Skip ManyToOneRel and ManyToManyRel fields which have no 'verbose_name' or 'help_text'
            if not hasattr(field, "verbose_name"):
                continue

            # Decode and strip any html out of the field's help text
            help_text = strip_tags(force_text(field.help_text))

            # Decode and capitalize the verbose name, for use if there isn't
            # any help text
            verbose_name = force_text(field.verbose_name).capitalize()

            if help_text:
                # Add the model field to the end of the docstring as a param
                # using the help text as the description
                lines.append(u":param %s: %s" % (field.attname, help_text))
            else:
                # Add the model field to the end of the docstring as a param
                # using the verbose name as the description
                lines.append(u":param %s: %s" % (field.attname, verbose_name))

            # Add the field's type to the docstring
            if isinstance(field, models.ForeignKey):
                to = field.rel.to
                lines.append(
                    u":type %s: %s to :class:`~%s`"
                    % (field.attname, type(field).__name__, to)
                )
            else:
                lines.append(u":type %s: %s" % (field.attname, type(field).__name__))

    return lines


# -- General configuration -----------------------------------------------------

# Add any Sphinx extension module names here, as strings. They can be extensions
# coming with Sphinx (named 'sphinx.ext.*') or your custom ones.
extensions = ["sphinx.ext.autodoc", "sphinx.ext.viewcode", "m2r"]

linkcheck_ignore = [
    "https://groups.google.com/a/learningequality.org/forum/#!forum/dev"
]

# Add any paths that contain templates here, relative to this directory.
templates_path = ["_templates"]

# The suffix(es) of source filenames.
# You can specify multiple suffix as a list of string:
source_suffix = [".rst", ".md"]

# The master toctree document.
master_doc = "index"

# General information about the project.
project = u"Kolibri developer documentation"
copyright = u"{year:d}, Learning Equality".format(year=datetime.now().year)

# The version info for the project you're documenting, acts as replacement for
# |version| and |release|, also used in various other places throughout the
# built documents.
#
# The short X.Y version.
version = kolibri.__version__
# The full version, including alpha/beta/rc tags.
release = kolibri.__version__

# List of patterns, relative to source directory, that match files and
# directories to ignore when looking for source files.
exclude_patterns = ["_build"]

# The name of the Pygments (syntax highlighting) style to use.
pygments_style = "sphinx"


# -- Options for HTML output ---------------------------------------------------

# The theme to use for HTML and HTML Help pages.  See the documentation for
# a list of builtin themes.
html_theme = "default"
on_rtd = os.environ.get("READTHEDOCS", None) == "True"


if not on_rtd:  # only import and set the theme if we're building docs locally
    import sphinx_rtd_theme

    html_theme = "sphinx_rtd_theme"
    html_theme_path = [".", sphinx_rtd_theme.get_html_theme_path()]

# Theme options are theme-specific and customize the look and feel of a theme
# further.  For a list of options available for each theme, see the
# documentation.
# html_theme_options = {}

# Add any paths that contain custom themes here, relative to this directory.
# html_theme_path = []

# The name for this set of Sphinx documents.  If None, it defaults to
# "<project> v<release> documentation".
# html_title = None

# A shorter title for the navigation bar.  Default is the same as html_title.
# html_short_title = None

# The name of an image file (relative to this directory) to place at the top
# of the sidebar.
html_logo = "logo.png"

# The name of an image file (within the static path) to use as favicon of the
# docs.  This file should be a Windows icon file (.ico) being 16x16 or 32x32
# pixels large.
# html_favicon = None

# Add any paths that contain custom static files (such as style sheets) here,
# relative to this directory. They are copied after the builtin static files,
# so a file named "default.css" will overwrite the builtin "default.css".
html_static_path = ["_static"]

# Wide, responsive tables not supported until this is merged
# https://github.com/rtfd/sphinx_rtd_theme/pull/432

# Approach 1, broken because of....
# https://github.com/rtfd/readthedocs.org/issues/2116
# html_context = {
#     'css_files': [
#         '_static/theme_overrides.css',  # override wide tables in RTD theme
#     ],
# }


# Approach 2 for custom stylesheet:
# adapted from: http://rackerlabs.github.io/docs-rackspace/tools/rtd-tables.html
# and https://github.com/altair-viz/altair/pull/418/files
# https://github.com/rtfd/sphinx_rtd_theme/issues/117
def setup(app):
    # Register the docstring processor with sphinx
    app.connect("autodoc-process-docstring", process_docstring)
    # Add our custom CSS overrides
    app.add_stylesheet("theme_overrides.css")


# If not '', a 'Last updated on:' timestamp is inserted at every page bottom,
# using the given strftime format.
html_last_updated_fmt = "%b %d, %Y"

# If true, SmartyPants will be used to convert quotes and dashes to
# typographically correct entities.
# html_use_smartypants = True

# If true, links to the reST sources are added to the pages.
html_show_sourcelink = False

# If true, "Created using Sphinx" is shown in the HTML footer. Default is True.
html_show_sphinx = False

# If true, "(C) Copyright ..." is shown in the HTML footer. Default is True.
html_show_copyright = False

# Output file base name for HTML help builder.
htmlhelp_basename = "kolibri-dev"


# -- I18N ----------------------------------------------------------------------

# The language for content autogenerated by Sphinx. Refer to documentation
# for a list of supported languages.
# language = None

locale_dirs = [os.path.join(os.getcwd(), "locale", "docs")]
