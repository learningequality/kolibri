from rest_framework import routers

from .api import PingbackNotificationDismissedViewSet
from .api import PingbackNotificationViewSet

router = routers.SimpleRouter()

router.register(
    r"pingbacknotification",
    PingbackNotificationViewSet,
    basename="pingbacknotification",
)
router.register(
    r"pingbacknotificationdismissed",
    PingbackNotificationDismissedViewSet,
    basename="pingbacknotificationdismissed",
)

urlpatterns = router.urls
