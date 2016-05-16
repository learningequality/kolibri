"""
Kolibri Webpack hooks
---------------------

To manage assets, we use the webpack format. In order to have assets bundled in,
you should put them in ``yourapp/assets/src``.
"""

from __future__ import absolute_import, print_function, unicode_literals

import json
import logging
import os
import time

from django.conf import settings as django_settings
from django.contrib.staticfiles.storage import staticfiles_storage
from django.utils.functional import cached_property
from django.utils.safestring import mark_safe

from kolibri.core.webpack.utils import render_as_url
from kolibri.plugins import hooks

from . import settings


class BundleNotFound(Exception):
    pass

class WebpackError(EnvironmentError):
    pass


logger = logging.getLogger(__name__)


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

    # : The static directory where you want stuff to be written to
    static_dir = "kolibri/core/static"

    def __init__(self, *args, **kwargs):
        super(WebpackBundleHook, self).__init__(*args, **kwargs)

        # Verify the uniqueness of the slug
        # It can be '0' in the parent class constructor
        assert \
            len([x for x in self.registered_hooks if x.unique_slug == self.unique_slug]) <= 1, \
            "Non-unique slug found: '{}'".format(self.unique_slug)

    class Meta:
        abstract = True

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
    def stats_file_content(self):
        """
        TODO: This property is only cached on the instance, maybe it should be
        cached in a static module property instead so we can cache the JSON data
        across the whole app?

        :returns: A dict of the data contained in the JSON files which are
        written by Webpack.
        """
        with open(self.stats_file) as f:
            stats = json.load(f)
        if django_settings.DEBUG:
            timeout = 0
            while stats['status'] == 'compiling':
                time.sleep(getattr(settings, 'WEBPACK_POLL_INTERVAL', 0.1))
                timeout += getattr(settings, 'WEBPACK_POLL_INTERVAL', 0.1)
                with open(self.stats_file) as f:
                    stats = json.load(f)
                if timeout >= getattr(settings, 'WEBPACK_POLL_INTERVAL', 1.0):
                    raise WebpackError('Webpack compilation still in progress')
            if stats['status'] == 'error':
                raise WebpackError('Webpack compilation has errored')
        return {
            "files": stats["chunks"][self.unique_slug]
        }

    @property
    @hooks.registered_method
    def bundle(self):
        """
        TODO: This is weird, why are we creating this as a dict object?

        :returns: a generator yielding dict objects with properties of the built
        asset, most notably its URL.
        """
        for f in self.stats_file_content["files"]:
            filename = f['name']
            if any(regex.match(filename) for regex in settings.IGNORE_PATTERNS):
                continue
            relpath = '{0}/{1}'.format(self.unique_slug, filename)
            f['url'] = staticfiles_storage.url(relpath)
            yield f

    @hooks.registered_method
    def bundle_filtered(self, extension=None):
        """
        TODO: Why is this helper function necessary!?

        :returns: a possibly filtered list of data from self.bundle
        """
        bundle = self.bundle
        if extension:
            bundle = (chunk for chunk in bundle if chunk['name'].endswith('.{0}'.format(extension)))
        return bundle

    @property
    @hooks.registered_method
    def webpack_bundle_data(self):
        """
        This is the main interface to the NPM Webpack building util. It is
        used by the webpack_json management command. Inheritors may wish to
        customize this.

        :returns: A dict with information expected by webpack parsing process.
        """
        return {
            "name": self.unique_slug,
            "src_file": self.src_file,
            "static_dir": self.static_dir,
            "stats_file": self.stats_file,
            "events": {},
            "once": {},
        }

    @property
    def build_path(self):
        """
        An auto-generated path to where the build-time files are stored,
        containing information about the built bundles.
        """
        return os.path.join(
            os.path.abspath(os.path.dirname(__name__)),
            self._module_file_path,
            "build"
        )

    @property
    def stats_file(self):
        """
        TODO: Do we want to rely on a generated stats file? It will have to be
        read for every bundle, every time stuff is loaded.

        An auto-generated path to where the build-time files are stored,
        containing information about the built bundles.
        """
        return os.path.join(
            self.build_path,
            "{plugin}_stats.json".format(plugin=self.unique_slug)
        )

    @property
    def _module_file_path(self):
        """
        Returns the path of the class inheriting this classmethod.
        """
        return os.path.join(*self.__module__.split(".")[:-1])

    def render_to_html(self, extension=None):
        """
        This function tags a bundle of file chunks and generates the appropriate
        script tags for them, be they JS or CSS files.

        :param bundle_data: The data returned from
        :return: HTML of script tags for insertion into a page.
        """
        tags = []
        js_tag = '<script type="text/javascript" src="{url}"></script>'
        css_tag = '<link type="text/css" href="{url}" rel="stylesheet"/>'
        for chunk in self.bundle_filtered(extension=extension):
            if chunk['name'].endswith('.js'):
                tags.append(js_tag.format(url=render_as_url(chunk)))
            elif chunk['name'].endswith('.css'):
                tags.append(css_tag.format(url=render_as_url(chunk)))
        return mark_safe('\n'.join(tags))


class FrontEndAssetHook(WebpackBundleHook):
    """
    An abstract class for all assets destined for the default front-end. You
    probably want to use FrontEndSyncHook or FrontEndASyncHook to be explicit.

    Everything inheriting from this hook will automatically be included in the
    front-end.
    """

    class Meta:
        abstract = True


class FrontEndSyncHook(FrontEndAssetHook):
    """
    Define something that should be included for sync'ed purposes. Assets will
    always be loaded.
    """

    class Meta:
        abstract = True


class FrontEndCoreHook(FrontEndSyncHook):
    """
    A hook that asserts its only applied once, namely to load the core
    """

    def __init__(self, *args, **kwargs):
        super(FrontEndCoreHook, self).__init__(*args, **kwargs)
        assert len(list(self.registered_hooks)) <= 1, "Only one core asset allowed"

    @property
    @hooks.registered_method
    def webpack_bundle_data(self):
        dct = super(FrontEndCoreHook, self).webpack_bundle_data
        dct['core'] = True
        dct['external'] = True
        return dct

    class Meta:
        abstract = True


class FrontEndASyncHook(FrontEndAssetHook):
    """
    Define something that should be included for sync'ed purposes.
    """

    # : A list of events to listen to
    events = {}

    # : A list of events to load the asset once
    once = {}

    @property
    @hooks.registered_method
    def webpack_bundle_data(self):
        dct = super(FrontEndASyncHook, self).webpack_bundle_data
        dct['events'] = self.events
        dct['once'] = self.once
        return dct

    class Meta:
        abstract = True

    def render_to_html(self):
        """
        This function returns a script tag containing Javascript to register an
        asynchronously loading Javascript FrontEnd plugin against the core
        front-end Kolibri app. It passes in the events that would trigger
        loading the plugin, both multi-time firing events (events) and one time
        firing events (once).

        It also passes in information about the methods that the events should
        be delegated to once the plugin has loaded.

        :returns: HTML of a script tag to insert into a page.
        """
        urls = [render_as_url(chunk) for chunk in self.bundle]
        js = 'Kolibri.register_kolibri_module_async("{bundle}", ["{urls}"], {events}, {once});'.format(
            bundle=self.unique_slug,
            urls='","'.join(urls),
            events=json.dumps(self.events),
            once=json.dumps(self.once)
        )
        return mark_safe('<script>{js}</script>'.format(js=js))
