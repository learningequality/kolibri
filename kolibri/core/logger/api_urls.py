from django.conf.urls import url
from rest_framework import routers

from .api import AttemptLogViewSet
from .api import MasteryLogViewSet
from .api import ProgressTrackingViewSet
from .api import TotalContentProgressViewSet
from .csv_export import download_csv_file
from .csv_export import exported_logs_info

router = routers.SimpleRouter()

router.register(r"masterylog", MasteryLogViewSet, base_name="masterylog")
router.register(r"attemptlog", AttemptLogViewSet, base_name="attemptlog")
router.register(r"userprogress", TotalContentProgressViewSet, base_name="userprogress")
router.register(r"trackprogress", ProgressTrackingViewSet, base_name="trackprogress")

router.urls.append(
    url(
        r"^downloadcsvfile/(?P<log_type>.*)/(?P<facility_id>.*)/$",
        download_csv_file,
        name="download_csv_file",
    )
)

router.urls.append(
    url(
        r"^exportedlogsinfo/(?P<facility_id>.*)/(?P<facility>.*)/$",
        exported_logs_info,
        name="exportedlogsinfo",
    )
)

urlpatterns = router.urls
