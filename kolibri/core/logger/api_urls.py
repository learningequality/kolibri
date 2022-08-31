from rest_framework import routers

from .api import AttemptLogViewSet
from .api import MasteryLogViewSet
from .api import ProgressTrackingViewSet
from .api import TotalContentProgressViewSet

router = routers.SimpleRouter()

router.register(r"masterylog", MasteryLogViewSet, base_name="masterylog")
router.register(r"attemptlog", AttemptLogViewSet, base_name="attemptlog")
router.register(r"userprogress", TotalContentProgressViewSet, base_name="userprogress")
router.register(r"trackprogress", ProgressTrackingViewSet, base_name="trackprogress")

urlpatterns = router.urls
