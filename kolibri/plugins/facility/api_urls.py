from django.conf.urls import url

from .views import download_csv_file

urlpatterns = [
    url(
        r"^downloadcsvfile/(?P<filename>.*)/$",
        download_csv_file,
        name="download_csv_file",
    )
]
