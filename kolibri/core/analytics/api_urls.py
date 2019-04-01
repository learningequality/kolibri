from rest_framework import routers

from .api import PingbackNotificationDismissedViewSet
from .api import PingbackNotificationViewSet

router = routers.SimpleRouter()

router.register(
    r"pingbacknotification",
    PingbackNotificationViewSet,
    base_name="pingbacknotification",
)
router.register(
    r"pingbacknotificationdismissed",
    PingbackNotificationDismissedViewSet,
    base_name="pingbacknotificationdismissed",
)

urlpatterns = router.urls
