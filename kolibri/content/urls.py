from django.conf.urls import url

from .views import ZipContentView

urlpatterns = [
    url(r'^zipcontent/(?P<zipped_filename>[^/]+)/(?P<embedded_filepath>.*)', ZipContentView.as_view(), {}, "zipcontent"),
]
