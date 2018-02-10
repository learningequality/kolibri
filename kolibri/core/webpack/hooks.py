"""
Kolibri Webpack hooks
---------------------

To manage assets, we use the webpack format. In order to have assets bundled in,
you should put them in ``yourapp/assets/src``.
"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import json
import logging
import os
import time
from functools import partial

from django.conf import settings as django_settings
from django.contrib.staticfiles.storage import staticfiles_storage
from django.utils.functional import cached_property
from django.utils.safestring import mark_safe
from django.utils.translation import get_language
from django.utils.translation import get_language_info
from django.utils.translation import to_locale
from pkg_resources import resource_filename

import kolibri
from . import settings
from kolibri.plugins import hooks
from kolibri.utils import conf

# We load quite a few JSON files from disk, as cached properties of
# the WebpackBundleHook - but these are only cached per instance
# whereas we want them cached on a per class basis.
# Use this global to cache the results of JSON file loads and reduce
# disk access.
_JSON_STATS_FILE_CACHE = {}
_JSON_MESSAGES_FILE_CACHE = {}


class BundleNotFound(Exception):
    pass


class WebpackError(EnvironmentError):
    pass


logger = logging.getLogger(__name__)

def filter_by_bidi(bidi, chunk):
    if chunk['name'].split('.')[-1] != 'css':
        return True
    if bidi:
        return chunk['name'].split('.')[-2] == 'rtl'
    else:
        return chunk['name'].split('.')[-2] != 'rtl'


class WebpackBundleHook(hooks.KolibriHook):
    """
    This is the abstract hook class that all plugins that wish to load any
    assets into the front end must implement, in order for them to be part of
    the webpack asset loading pipeline.
    """

    # : You should set a unique human readable name
    unique_slug = ""

    # : Relative path to js source file for webpack to use as entry point
    # : For instance: "kolibri/core/assets/src/kolibri_core_app.js"
    src_file = ""

    # : A list of events to listen to
    events = {}

    # : A list of events to load the asset once
    once = {}

    # : Kolibri version for build hashes
    version = kolibri.__version__

    def __init__(self, *args, **kwargs):
        super(WebpackBundleHook, self).__init__(*args, **kwargs)

        # Verify the uniqueness of the slug
        # It can be '0' in the parent class constructor
        assert \
            len([x for x in self.registered_hooks if x.unique_slug == self.unique_slug]) <= 1, \
            "Non-unique slug found: '{}'".format(self.unique_slug)
        if not self._meta.abstract:
            assert self.src_file, "No source JS defined"

    @hooks.abstract_method
    def get_by_slug(self, slug):
        """
        Fetch a registered hook instance by its unique slug
        """
        for hook in self.registered_hooks:
            if hook.unique_slug == slug:
                return hook
        raise BundleNotFound("No bundle with that name is loaded: {}".format(slug))

    @cached_property
    @hooks.registered_method
    def _stats_file_content(self):
        """
        :returns: A dict of the data contained in the JSON files which are
          written by Webpack.
        """
        global _JSON_STATS_FILE_CACHE
        try:
            if not _JSON_STATS_FILE_CACHE.get(self.unique_slug) or django_settings.DEBUG:
                with open(self._stats_file) as f:
                    stats = json.load(f)
                if django_settings.DEBUG:
                    timeout = 0
                    while stats['status'] == 'compiling':
                        time.sleep(getattr(settings, 'WEBPACK_POLL_INTERVAL', 0.1))
                        timeout += getattr(settings, 'WEBPACK_POLL_INTERVAL', 0.1)
                        with open(self._stats_file) as f:
                            stats = json.load(f)
                        if timeout >= getattr(settings, 'WEBPACK_POLL_INTERVAL', 1.0):
                            raise WebpackError('Webpack compilation still in progress')
                    if stats['status'] == 'error':
                        raise WebpackError('Webpack compilation has errored')
                _JSON_STATS_FILE_CACHE[self.unique_slug] = {
                    "files": stats.get("chunks", {}).get(self.unique_slug, []),
                    "hasMessages": stats.get("messages", False),
                }
            return _JSON_STATS_FILE_CACHE[self.unique_slug]
        except IOError:
            raise WebpackError('Webpack build file missing, front-end assets cannot be loaded')

    @property
    @hooks.registered_method
    def bundle(self):
        """
        :returns: a generator yielding dict objects with properties of the built
          asset, most notably its URL.
        """
        for f in self._stats_file_content["files"]:
            filename = f['name']
            if any(list(regex.match(filename) for regex in settings.IGNORE_PATTERNS)):
                continue
            relpath = '{0}/{1}'.format(self.unique_slug, filename)
            if django_settings.DEBUG:
                f['url'] = f['publicPath']
            else:
                f['url'] = staticfiles_storage.url(relpath)
            yield f

    @property
    @hooks.registered_method
    def webpack_bundle_data(self):
        """
        This is the main interface to the NPM Webpack building util. It is
        used by the webpack_json management command. Inheritors may wish to
        customize this.

        :returns: A dict with information expected by webpack parsing process,
            or None if the src_file does not exist.

        """
        if os.path.exists(os.path.join(os.path.dirname(self._build_path), self.src_file)):
            return {
                "name": self.unique_slug,
                "src_file": self.src_file,
                "static_dir": self._static_dir,
                "plugin_path": self._module_file_path,
                "stats_file": self._stats_file,
                "events": self.events,
                "once": self.once,
                "static_url_root": getattr(django_settings, 'STATIC_URL'),
                "locale_data_folder": self.locale_data_folder,
                "version": self.version,
            }
        else:
            logger.warn("{src_file} not found for plugin {name}.".format(src_file=self.src_file, name=self.unique_slug))

    @property
    def locale_data_folder(self):
        if self._module_path.startswith('kolibri.'):
            return os.path.join(getattr(django_settings, 'LOCALE_PATHS')[0], 'en', 'LC_FRONTEND_MESSAGES')
        # Is an external plugin, do otherwise!
        else:
            return os.path.join(
                os.path.dirname(self._build_path),
                getattr(self, 'locale_path', 'locale'), 'en', 'LC_FRONTEND_MESSAGES')

    @property
    def _module_path(self):
        return '.'.join(self.__module__.split('.')[:-1])

    @property
    def _build_path(self):
        """
        An auto-generated path to where the build-time files are stored,
        containing information about the built bundles.
        """
        return resource_filename(self._module_path, 'build')

    @property
    def _static_dir(self):
        return resource_filename(self._module_path, 'static')

    @property
    def _stats_file(self):
        """
        An auto-generated path to where the build-time files are stored,
        containing information about the built bundles.
        """
        return os.path.join(
            self._build_path,
            '{plugin}_stats.json'.format(plugin=self.unique_slug)
        )

    @property
    def _module_file_path(self):
        """
        Returns the path of the class inheriting this classmethod.
        """
        return os.path.dirname(self._build_path)

    def frontend_message_file(self, lang_code):
        message_file_name = "{name}-messages.json".format(name=self.unique_slug)
        for path in getattr(django_settings, 'LOCALE_PATHS', []):
            file_path = os.path.join(
                path,
                to_locale(lang_code),
                "LC_FRONTEND_MESSAGES",
                message_file_name)
            if os.path.exists(file_path):
                return file_path

    def frontend_messages(self):
        global _JSON_MESSAGES_FILE_CACHE
        lang_code = get_language()
        if not _JSON_MESSAGES_FILE_CACHE.get(self.unique_slug, {}).get(lang_code) or django_settings.DEBUG:
            frontend_message_file = self.frontend_message_file(lang_code)
            if frontend_message_file:
                with open(frontend_message_file) as f:
                    if not _JSON_MESSAGES_FILE_CACHE.get(self.unique_slug):
                        _JSON_MESSAGES_FILE_CACHE[self.unique_slug] = {}
                    # Load JSON file, then immediately convert it to a string in minified form.
                    _JSON_MESSAGES_FILE_CACHE[self.unique_slug][lang_code] = json.dumps(
                        json.load(f), separators=(',', ':'))
        return _JSON_MESSAGES_FILE_CACHE.get(self.unique_slug, {}).get(lang_code)

    def sorted_chunks(self):
        bidi = get_language_info(get_language())['bidi']
        return sorted(filter(partial(filter_by_bidi, bidi), self.bundle), key=lambda x: x['name'].split('.')[-1])

    def js_and_css_tags(self):
        js_tag = '<script type="text/javascript" src="{url}"></script>'
        css_tag = '<link type="text/css" href="{url}" rel="stylesheet"/>'
        # Sorted to load css before js
        for chunk in self.sorted_chunks():
            if chunk['name'].endswith('.js'):
                yield js_tag.format(url=chunk['url'])
            elif chunk['name'].endswith('.css'):
                yield css_tag.format(url=chunk['url'])

    def frontend_message_tag(self):
        if self.frontend_messages():
            return ['<script>{kolibri_name}.registerLanguageAssets("{bundle}", "{lang_code}", {messages});</script>'.format(
                kolibri_name=conf.KOLIBRI_CORE_JS_NAME,
                bundle=self.unique_slug,
                lang_code=get_language(),
                messages=self.frontend_messages(),
            )]
        else:
            return []

    def render_to_page_load_sync_html(self):
        """
        Generates the appropriate script tags for the bundle, be they JS or CSS
        files.

        :param bundle_data: The data returned from
        :return: HTML of script tags for insertion into a page.
        """
        tags = self.frontend_message_tag() + list(self.js_and_css_tags())

        return mark_safe('\n'.join(tags))

    def render_to_page_load_async_html(self):
        """
        Generates script tag containing Javascript to register an
        asynchronously loading Javascript FrontEnd plugin against the core
        front-end Kolibri app. It passes in the events that would trigger
        loading the plugin, both multi-time firing events (events) and one time
        firing events (once).

        It also passes in information about the methods that the events should
        be delegated to once the plugin has loaded.

        TODO: What do we do with the extension parameter here?

        :returns: HTML of a script tag to insert into a page.
        """
        urls = [chunk['url'] for chunk in self.sorted_chunks()]
        tags = self.frontend_message_tag() +\
            ['<script>{kolibri_name}.registerKolibriModuleAsync("{bundle}", ["{urls}"], {events}, {once});</script>'.format(
                kolibri_name=conf.KOLIBRI_CORE_JS_NAME,
                bundle=self.unique_slug,
                urls='","'.join(urls),
                events=json.dumps(self.events),
                once=json.dumps(self.once),
            )]
        return mark_safe('\n'.join(tags))

    class Meta:
        abstract = True


class WebpackInclusionHook(hooks.KolibriHook):
    """
    To define an asset target of inclusing in some html template, you must
    define an inheritor of ``WebpackBundleHook`` for the asset files themselves
    and then a ``WebpackInclusionHook`` to define where the inclusion takes
    place.

    This abstract hook does nothing, it's just the universal inclusion hook, and
    no templates intend to include ALL assets at once.
    """

    #: Should define an instance of ``WebpackBundleHook``, likely abstract
    bundle_class = None

    def __init__(self, *args, **kwargs):
        super(WebpackInclusionHook, self).__init__(*args, **kwargs)
        if not self._meta.abstract:
            assert \
                self.bundle_class is not None,\
                "Must specify bundle_class property, this one did not: {} ({})".format(
                    type(self),
                    type(self.bundle_class)
                )

    def render_to_page_load_sync_html(self):
        html = ""
        bundle = self.bundle_class()
        if not bundle._meta.abstract:
            html = bundle.render_to_page_load_sync_html()
        else:
            for hook in bundle.registered_hooks:
                html += hook.render_to_page_load_sync_html()
        return mark_safe(html)

    def render_to_page_load_async_html(self):
        html = ""
        bundle = self.bundle_class()
        if not bundle._meta.abstract:
            html = bundle.render_to_page_load_async_html()
        else:
            for hook in bundle.registered_hooks:
                html += hook.render_to_page_load_async_html()
        return mark_safe(html)

    class Meta:
        abstract = True


class FrontEndCoreAssetHook(WebpackBundleHook):

    def render_to_page_load_sync_html(self):
        """
        Generates the appropriate script tags for the core bundle, be they JS or CSS
        files.

        :return: HTML of script tags for insertion into a page.
        """
        tags = []
        if self.frontend_messages():
            tags = ['<script>var coreLanguageMessages = {messages};</script>'.format(
                messages=self.frontend_messages())]

        tags += list(self.js_and_css_tags())

        return mark_safe('\n'.join(tags))

    class Meta:
        abstract = True


class FrontEndCoreHook(WebpackInclusionHook):
    """
    A hook that asserts its only applied once, namely to load the core. This
    should only be inherited once which is also an enforced property for now.

    This is loaded before everything else.
    """

    bundle = FrontEndCoreAssetHook

    def __init__(self, *args, **kwargs):
        super(FrontEndCoreHook, self).__init__(*args, **kwargs)
        assert len(list(self.registered_hooks)) <= 1, "Only one core asset allowed"
        assert \
            isinstance(self.bundle, FrontEndCoreAssetHook),\
            "Only allows a FrontEndCoreAssetHook instance as bundle"

    class Meta:
        abstract = True


class FrontEndBaseSyncHook(WebpackInclusionHook):
    """
    Inherit a hook defining assets to be loaded in kolibri/base.html, that means
    ALL pages. Use with care.
    """

    class Meta:
        abstract = True


class FrontEndBaseASyncHook(WebpackInclusionHook):
    """
    Inherit a hook defining assets to be loaded in kolibri/base.html, that means
    ALL pages. Use with care.
    """

    class Meta:
        abstract = True
