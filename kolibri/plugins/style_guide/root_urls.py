from django.views.generic import RedirectView
from django.conf.urls import url

from . import views

urlpatterns = [
    url(r"^style_?guide.*", RedirectView.as_view(url="/design/")),
    url(r"^design$", RedirectView.as_view(url="/design/")),
    url(r"^design/.*$", views.StyleGuideView.as_view(), name="style_guide"),
]
