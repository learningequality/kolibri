from django.conf.urls import url

from .views import DownloadContentView
from .views import ZipContentView

urlpatterns = [
    url(r'^zipcontent/(?P<zipped_filename>[^/]+)/(?P<embedded_filepath>.*)', ZipContentView.as_view(), {}, "zipcontent"),
    url(r'^downloadcontent/(?P<filename>[^/]+)/(?P<new_filename>.*)', DownloadContentView.as_view(), {}, "downloadcontent"),
]
