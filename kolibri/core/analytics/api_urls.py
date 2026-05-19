from rest_framework import routers

from .api import LocalNotificationViewSet
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
router.register(
    r"localnotification",
    LocalNotificationViewSet,
    basename="localnotification",
)

urlpatterns = router.urls
