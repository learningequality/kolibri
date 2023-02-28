from rest_framework import routers

from .api import AttemptLogViewSet
from .api import GenerateCSVLogRequestViewSet
from .api import MasteryLogViewSet
from .api import ProgressTrackingViewSet
from .api import TotalContentProgressViewSet

router = routers.SimpleRouter()

router.register(r"masterylog", MasteryLogViewSet, basename="masterylog")
router.register(r"attemptlog", AttemptLogViewSet, basename="attemptlog")
router.register(r"userprogress", TotalContentProgressViewSet, basename="userprogress")
router.register(r"trackprogress", ProgressTrackingViewSet, basename="trackprogress")
router.register(
    r"generatecsvlogrequest",
    GenerateCSVLogRequestViewSet,
    basename="generatecsvlogrequest",
)

urlpatterns = router.urls
