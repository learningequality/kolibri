import logging

from django.conf.urls import include
from django.conf.urls import url

from kolibri.core.device.translation import i18n_patterns
from kolibri.plugins.registry import registered_plugins

logger = logging.getLogger(__name__)


def normalize_slug(url_slug):
    return url_slug.lstrip("^").rstrip("/") + "/"


def find_duplicate_slugs():
    # First look for conflicting slugs
    slugs = {}
    for plugin in registered_plugins:
        slug = normalize_slug(plugin.url_slug)
        if slug in slugs:
            slugs[slug].append(plugin.module_path)
        else:
            slugs[slug] = [plugin.module_path]
    duplicate_slugs = {}
    for key, value in slugs.items():
        if len(value) > 1:
            if all(map(lambda x: x.startswith("kolibri.plugins"), value)):
                # If we have multiple kolibri core plugins setting the same url slug, we should error out.
                # This is not acceptable.
                raise RuntimeError(
                    "Multiple core kolibri plugins define the same top level URL slug: {}".format(
                        key
                    )
                )
            duplicate_slugs[key] = value
    return duplicate_slugs


def get_urls():
    duplicate_slugs = find_duplicate_slugs()
    urlpatterns = []
    for plugin_instance in registered_plugins:
        url_module = plugin_instance.url_module
        api_url_module = plugin_instance.api_url_module
        instance_patterns = []
        # Normalize slug
        slug = normalize_slug(plugin_instance.url_slug)
        # If we have a collision, and one of the plugins is a kolibri core plugin, we let it take precedence.
        # If both are Kolibri core plugins, we have raised a RuntimeError already when checking for
        # duplicate slugs.
        if slug in duplicate_slugs and not plugin_instance.module_path.startswith(
            "kolibri.plugins"
        ):
            other_modules = ", ".join(
                filter(
                    lambda x: x != plugin_instance.module_path, duplicate_slugs[slug]
                )
            )
            logger.warn(
                "Plugin {} defines a top level URL slug that clashes with other plugins: {}".format(
                    other_modules
                )
            )
            slug = normalize_slug(plugin_instance.module_path.replace(".", ""))
        if url_module:
            instance_patterns += i18n_patterns(url_module.urlpatterns, prefix=slug)
        if api_url_module:
            instance_patterns.append(url(slug + "api/", include(api_url_module)))
        if instance_patterns:
            urlpatterns.append(
                url(
                    "",
                    include(instance_patterns, namespace=plugin_instance.module_path),
                )
            )

    return urlpatterns


def get_root_urls():
    urlpatterns = []
    for plugin_instance in registered_plugins:
        root_url_module = plugin_instance.root_url_module
        if root_url_module:
            urlpatterns.append(url("", include(root_url_module)))

    return urlpatterns
