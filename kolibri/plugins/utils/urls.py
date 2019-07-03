from django.conf.urls import include
from django.conf.urls import url

from kolibri.core.device.translation import i18n_patterns
from kolibri.plugins.registry import registered_plugins


def get_urls():
    urlpatterns = []
    for plugin_instance in registered_plugins:
        url_module = plugin_instance.url_module()
        api_url_module = plugin_instance.api_url_module()
        instance_patterns = []
        # Normalize slug
        slug = plugin_instance.url_slug().lstrip("^").rstrip("/") + "/"
        if url_module:
            instance_patterns += i18n_patterns(url_module.urlpatterns, prefix=slug)
        if api_url_module:
            instance_patterns.append(url(slug + "api/", include(api_url_module)))
        if instance_patterns:
            urlpatterns.append(
                url(
                    "",
                    include(
                        instance_patterns, namespace=plugin_instance.url_namespace()
                    ),
                )
            )

    return urlpatterns


def get_root_urls():
    urlpatterns = []
    for plugin_instance in registered_plugins:
        root_url_module = plugin_instance.root_url_module()
        if root_url_module:
            urlpatterns.append(url("", include(root_url_module)))

    return urlpatterns
