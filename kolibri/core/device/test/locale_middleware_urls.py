from __future__ import unicode_literals

from django.conf.urls import include
from django.conf.urls import url
from django.views.generic import TemplateView

from kolibri.core.device.translation import i18n_patterns

path_prefix = ""

view = TemplateView.as_view(template_name="dummy.html")

included = [url(r"^foo/$", view, name="not-prefixed-included-url")]

patterns = [
    url(r"^not-prefixed/$", view, name="not-prefixed"),
    url(r"^not-prefixed-include/", include(included)),
]

patterns += i18n_patterns(
    [
        url(r"^prefixed/$", view, name="prefixed"),
        url(r"^prefixed\.xml$", view, name="prefixed_xml"),
    ]
)

urlpatterns = [url(path_prefix, include(patterns))]
