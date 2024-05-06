from django.urls import re_path

from .views import ContentPermalinkRedirect

urlpatterns = [
    re_path(
        r"^viewcontent$", ContentPermalinkRedirect.as_view(), name="contentpermalink"
    ),
]
