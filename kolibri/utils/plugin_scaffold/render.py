"""
Template rendering core for the plugin scaffolder.

Renders ``.tmpl`` source through a standalone Django template engine and
writes a file tree, templating both file contents and destination paths.

A plain ``Engine()`` (no ``settings.configure()``, no app registry) is all
that is needed for placeholder substitution, so this stays dependency-free
and never boots Django. ``{% verbatim %}`` is a default builtin tag, letting
literal Vue/JS mustache survive the engine.
"""

import io
import os
from collections import namedtuple

from django.template import Context
from django.template import Engine

# A ``.tmpl`` source path (relative to ``TEMPLATES_DIR``) and its destination
# path relative to the plugin root. ``dest`` is itself a template string, e.g.
# ``"frontend/views/{{ pascal }}Index.vue"``.
FileSpec = namedtuple("FileSpec", ["src", "dest"])

TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "templates")

_engine = None


def _get_engine():
    global _engine
    if _engine is None:
        _engine = Engine()
    return _engine


def render_string(source, context):
    """
    Render a template ``source`` string with ``context``.

    :param source: a Django template string.
    :param context: a dict of substitution values.
    :returns: the rendered string.
    """
    # ``autoescape=False``: the rendered output is source code (Python, JS,
    # TOML), not HTML, so substituted values must pass through verbatim.
    # Otherwise metadata like an author "O'Brien & Co" or a description
    # containing ``&``/``<``/``"`` would be HTML-escaped into the generated files.
    return _get_engine().from_string(source).render(Context(context, autoescape=False))


def render_tree(specs, context, root):
    """
    Render each :class:`FileSpec` and write it under ``root``.

    For each spec the destination path is rendered first (to derive the
    final relative path), then the ``.tmpl`` contents are rendered and
    written UTF-8. Refuses to overwrite: an existing target raises
    :class:`FileExistsError`.

    :param specs: an iterable of :class:`FileSpec`.
    :param context: a dict of substitution values.
    :param root: the plugin root directory to write into.
    :returns: the list of absolute paths written.
    """
    written = []
    for spec in specs:
        dest = render_string(spec.dest, context)
        target = os.path.join(str(root), dest)
        if os.path.exists(target):
            raise FileExistsError(target)
        src_path = os.path.join(TEMPLATES_DIR, spec.src)
        with io.open(src_path, encoding="utf-8") as f:
            source = f.read()
        rendered = render_string(source, context)
        os.makedirs(os.path.dirname(target), exist_ok=True)
        with io.open(target, "w", encoding="utf-8") as f:
            f.write(rendered)
        written.append(target)
    return written
