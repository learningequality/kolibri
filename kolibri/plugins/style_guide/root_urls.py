from django.views.generic import RedirectView
from django.conf.urls import url

redirect = RedirectView.as_view(url="https://designsystem.learningequality.org"),

urlpatterns = [
    url(r"^style_?guide.*", redirect),
    url(r"^design$", redirect),
    url(r"^design/.*$", redirect),
]
