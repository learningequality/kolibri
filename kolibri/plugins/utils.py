from django.core.urlresolvers import reverse


def plugin_url(plugin_class, url_name):
    return reverse('kolibri:{namespace}:{url_name}'.format(
        namespace=plugin_class().url_namespace(),
        url_name=url_name,
    ))
