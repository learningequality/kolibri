from django.conf.urls import url

from .views import LearnView
from .views import MyDownloadsView

urlpatterns = [
    url(r"^$", LearnView.as_view(), name="learn"),
    url(r"^my-downloads$", MyDownloadsView.as_view(), name="my_downloads"),
]
