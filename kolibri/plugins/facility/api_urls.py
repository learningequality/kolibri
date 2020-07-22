from django.conf.urls import url

from .views import download_csv_file

urlpatterns = [
    url(
        r"^downloadcsvfile/(?P<filename>.*)/(?P<facility_id>.*)$",
        download_csv_file,
        name="download_csv_file",
    )
]
