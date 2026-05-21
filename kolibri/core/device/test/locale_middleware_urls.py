from django.urls import include
from django.urls import path
from django.urls import re_path
from django.views.generic import TemplateView
from django.views.generic.base import RedirectView

from kolibri.core.device.translation import i18n_patterns

path_prefix = ""

view = TemplateView.as_view(template_name="dummy.html")

included = [re_path(r"^foo/$", view, name="not-prefixed-included-url")]

patterns = [
    re_path(r"^not-prefixed/$", view, name="not-prefixed"),
    re_path(r"^not-prefixed-include/", include(included)),
]

patterns += i18n_patterns(
    [
        re_path(r"^prefixed/$", view, name="prefixed"),
        re_path(r"^prefixed\.xml$", view, name="prefixed_xml"),
        re_path(
            r"^prefixed-redirect/$",
            RedirectView.as_view(pattern_name="not-prefixed"),
            name="prefixed-redirect",
        ),
    ]
)

urlpatterns = [path(path_prefix, include(patterns))]
