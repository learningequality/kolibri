from rest_framework import routers

from .api import DynamicNetworkLocationViewSet
from .api import NetworkLocationFacilitiesView
from .api import NetworkLocationViewSet
from .api import PinnedDeviceViewSet
from .api import StaticNetworkLocationViewSet

router = routers.SimpleRouter()

router.register(r"networklocation", NetworkLocationViewSet, basename="networklocation")
router.register(
    r"staticnetworklocation",
    StaticNetworkLocationViewSet,
    basename="staticnetworklocation",
)
router.register(
    r"dynamicnetworklocation",
    DynamicNetworkLocationViewSet,
    basename="dynamicnetworklocation",
)

router.register(
    r"networklocation_facilities",
    NetworkLocationFacilitiesView,
    basename="networklocation_facilities",
)
router.register(
    r"pinned_devices",
    PinnedDeviceViewSet,
    basename="pinned_devices",
)

urlpatterns = router.urls
