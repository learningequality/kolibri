from django.urls import re_path

from .views import LearnView
from .views import MyDownloadsView

urlpatterns = [
    re_path(r"^$", LearnView.as_view(), name="learn"),
    re_path(r"^my-downloads$", MyDownloadsView.as_view(), name="my_downloads"),
]
