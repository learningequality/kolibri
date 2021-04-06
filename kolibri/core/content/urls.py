from django.conf.urls import url

from .views import ContentPermalinkRedirect
from .views import DownloadContentView

urlpatterns = [
    url(
        r"^downloadcontent/(?P<filename>[^/]+)/(?P<new_filename>.*)",
        DownloadContentView.as_view(),
        {},
        "downloadcontent",
    ),
    url(r"^viewcontent$", ContentPermalinkRedirect.as_view(), name="contentpermalink"),
]
