from rest_framework import routers

from .viewsets.analytics import LocalNotificationViewSet
from .viewsets.analytics import PingbackNotificationDismissedViewSet
from .viewsets.analytics import PingbackNotificationViewSet

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
