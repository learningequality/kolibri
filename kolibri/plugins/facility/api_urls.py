from django.urls import re_path

from .views import download_csv_file
from .views import exported_csv_info
from .views import first_log_date

urlpatterns = [
    re_path(
        r"^downloadcsvfile/(?P<csv_type>.*)/(?P<facility_id>.*)/$",
        download_csv_file,
        name="download_csv_file",
    ),
    re_path(
        r"^exportedcsvinfo/(?P<facility_id>.*)/$",
        exported_csv_info,
        name="exportedcsvinfo",
    ),
    re_path(
        r"^firstlogdate/(?P<facility_id>.*)/$",
        first_log_date,
        name="firstlogdate",
    ),
]
