from django.conf.urls import url

from .views import ContentPermalinkRedirect

urlpatterns = [
    url(r"^viewcontent$", ContentPermalinkRedirect.as_view(), name="contentpermalink"),
]
