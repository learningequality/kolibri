"""
Kolibri Webpack hooks
---------------------

To manage assets, we use the webpack format. In order to have assets bundled in,
you should put them in ``yourapp/assets/src``.
"""
import codecs
import io
import json
import logging
import os
import re
import time
from abc import abstractmethod
from functools import partial
from urllib.request import url2pathname

from django.conf import settings
from django.contrib.staticfiles.finders import find as find_staticfiles
from django.contrib.staticfiles.storage import staticfiles_storage
from django.core.serializers.json import DjangoJSONEncoder
from django.utils.functional import cached_property
from django.utils.safestring import mark_safe
from django.utils.translation import get_language
from django.utils.translation import get_language_info
from django.utils.translation import to_locale
from importlib_resources import files

from kolibri.plugins import hooks


IGNORE_PATTERNS = (re.compile(I) for I in [r".+\.hot-update.js", r".+\.map"])


class WebpackError(Exception):
    def __init__(self, message, extra_info=None):
        self.extra_info = extra_info or {}
        Exception.__init__(self, message)


logger = logging.getLogger(__name__)


def filter_by_bidi(bidi, chunk):
    if chunk["name"].split(".")[-1] != "css":
        return True
    if bidi:
        return chunk["name"].split(".")[-2] == "rtl"
    return chunk["name"].split(".")[-2] != "rtl"


@hooks.define_hook
class WebpackBundleHook(hooks.KolibriHook):
    """
    This is the abstract hook class that all plugins that wish to load any
    assets into the front end must implement, in order for them to be part of
    the webpack asset loading pipeline.
    """

    # : You should set a human readable name that is unique within the
    # : plugin in which this is defined.
    @property
    @abstractmethod
    def bundle_id(self):
        pass

    # : A mapping of key to JSON serializable value.
    # : This plugin_data will be bootstrapped into a global object on window
    # : with a key of the unique_id as a Javascript object
    plugin_data = {}

    @classmethod
    def get_by_unique_id(cls, unique_id):
        """
        Fetch a registered hook instance by its unique_id
        """
        hook = cls.get_hook(unique_id)
        if hook:
            return hook
        raise WebpackError("No bundle with that name is loaded: '{}'".format(unique_id))

    @cached_property
    def _stats_file_content(self):
        """
        :returns: A dict of the data contained in the JSON files which are
          written by Webpack.
        """
        stats = self.get_stats()

        if getattr(settings, "DEVELOPER_MODE", False):
            timeout = 0

            while stats["status"] == "compile":
                time.sleep(0.1)
                timeout += 0.1

                stats = self.get_stats()

                if timeout >= 5:
                    raise WebpackError("Compilation still in progress")

            if stats["status"] == "error":
                raise WebpackError("Compilation has errored", stats)

        stats_file_content = {
            "files": stats.get("chunks", {}).get(self.unique_id, []),
        }

        return stats_file_content

    @property
    def bundle(self):
        """
        :returns: a generator yielding dict objects with properties of the built
          asset, most notably its URL.
        """
        for f in self._stats_file_content["files"]:
            filename = f["name"]
            if not getattr(settings, "DEVELOPER_MODE", False):
                if any(regex.match(filename) for regex in IGNORE_PATTERNS):
                    continue
            relpath = "{0}/{1}".format(self.unique_id, filename)
            if getattr(settings, "DEVELOPER_MODE", False):
                try:
                    f["url"] = f["publicPath"]
                    if f["url"].startswith("auto"):
                        raise KeyError
                except KeyError:
                    f["url"] = staticfiles_storage.url(relpath)
            else:
                f["url"] = staticfiles_storage.url(relpath)
            yield f

    @property
    def unique_id(self):
        """
        Returns a globally unique id for the frontend module bundle.
        This is created by appending the locally unique bundle_id to the
        Python module path. This should give a globally unique id for the module
        and prevent accidental or malicious collisions.
        """
        return "{}.{}".format(self._module_path, self.bundle_id)

    def get_stats(self):
        """
        An auto-generated path to where the build-time files are stored,
        containing information about the built bundles.
        """
        try:
            return json.loads(
                files(self._module_path)
                .joinpath("build")
                .joinpath("{plugin}_stats.json".format(plugin=self.unique_id))
                .read_text()
            )
        except IOError as e:
            raise WebpackError(
                "Error accessing stats file '{}': {}".format(self.unique_id, e)
            )

    def frontend_message_file(self, lang_code):
        message_file_name = "{name}-messages.json".format(name=self.unique_id)
        for path in getattr(settings, "LOCALE_PATHS", []):
            file_path = os.path.join(
                path, to_locale(lang_code), "LC_MESSAGES", message_file_name
            )
            if os.path.exists(file_path):
                return file_path

    def frontend_messages(self):
        lang_code = get_language()
        frontend_message_file = self.frontend_message_file(lang_code)
        if frontend_message_file:
            with io.open(frontend_message_file, mode="r", encoding="utf-8") as f:
                message_file_content = json.load(f)
            return message_file_content

    def sorted_chunks(self):
        bidi = get_language_info(get_language())["bidi"]
        return sorted(
            filter(partial(filter_by_bidi, bidi), self.bundle),
            key=lambda x: x["name"].split(".")[-1],
        )

    def js_and_css_tags(self):
        js_tag = '<script type="text/javascript" src="{url}"></script>'
        css_tag = '<link type="text/css" href="{url}" rel="stylesheet"/>'
        # Sorted to load css before js
        for chunk in self.sorted_chunks():
            if chunk["name"].endswith(".js"):
                yield js_tag.format(url=chunk["url"])
            elif chunk["name"].endswith(".css"):
                yield css_tag.format(url=chunk["url"])

    def frontend_message_tag(self):
        if self.frontend_messages():
            return [
                """
                        <template data-i18n="{bundle}">
                            {messages}
                        </template>""".format(
                    bundle=self.unique_id,
                    messages=json.dumps(
                        self.frontend_messages(),
                        separators=(",", ":"),
                        ensure_ascii=False,
                    ),
                )
            ]
        return []

    def plugin_data_tag(self):
        if self.plugin_data:
            return [
                """
                        <template data-plugin="{bundle}">
                            {plugin_data}
                        </template>
                        """.format(
                    bundle=self.unique_id,
                    plugin_data=json.dumps(
                        self.plugin_data,
                        separators=(",", ":"),
                        ensure_ascii=False,
                        cls=DjangoJSONEncoder,
                    ),
                )
            ]
        return []

    def get_basename(self, url):
        """
        Takes full path to a static file (eg. "/static/css/style.css") and
        returns path with storage's base url removed (eg. "css/style.css").
        """
        base_url = staticfiles_storage.base_url

        # Cast ``base_url`` to a string to allow it to be
        # a string-alike object to e.g. add ``SCRIPT_NAME``
        # WSGI param as a *path prefix* to the output URL.
        # See https://code.djangoproject.com/ticket/25598.
        base_url = str(base_url)

        if not url.startswith(base_url):
            return None

        basename = url.replace(base_url, "", 1)
        # drop the querystring, which is used for non-compressed cache-busting.
        return basename.split("?", 1)[0]

    def get_filename(self, basename):
        """
        Returns full path to a file, for example:

        get_filename('css/one.css') -> '/full/path/to/static/css/one.css'
        """
        filename = None
        # First try finding the file using the storage class.
        # This is skipped in DEVELOPER_MODE mode as files might be outdated
        # Or may not even be on disk.
        if not getattr(settings, "DEVELOPER_MODE", False):
            filename = staticfiles_storage.path(basename)
            if not staticfiles_storage.exists(basename):
                filename = None
        # secondly try to find it with staticfiles
        if not filename:
            filename = find_staticfiles(url2pathname(basename))
        return filename

    def get_filecontent(self, url):
        """
        Reads file contents using given `charset` and returns it as text.
        """
        # Removes Byte Oorder Mark
        charset = "utf-8-sig"
        basename = self.get_basename(url)

        if basename is None:
            return None

        filename = self.get_filename(basename)

        if filename is None:
            return None

        with codecs.open(filename, "r", charset) as fd:
            content = fd.read()
        # Cache this forever, as URLs will update for new files
        return content

    def render_to_page_load_sync_html(self):
        """
        Generates the appropriate script tags for the bundle, be they JS or CSS
        files.

        :param bundle_data: The data returned from
        :return: HTML of script tags for insertion into a page.
        """
        tags = (
            self.plugin_data_tag()
            + self.frontend_message_tag()
            + list(self.js_and_css_tags())
        )

        return mark_safe("\n".join(tags))


class WebpackInclusionMixin(object):
    @property
    @abstractmethod
    def bundle_html(self):
        pass

    @property
    @abstractmethod
    def bundle_class(self):
        pass

    @classmethod
    def html(cls):
        tags = []
        for hook in cls.registered_hooks:
            tags.append(hook.bundle_html)
        return mark_safe("\n".join(tags))


class WebpackInclusionSyncMixin(hooks.KolibriHook, WebpackInclusionMixin):
    @property
    def bundle_html(self):
        bundle = self.bundle_class()
        html = bundle.render_to_page_load_sync_html()
        return mark_safe(html)
