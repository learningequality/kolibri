from rest_framework import routers

from .viewsets.network_location import DynamicNetworkLocationViewSet
from .viewsets.network_location import NetworkLocationFacilitiesView
from .viewsets.network_location import NetworkLocationViewSet
from .viewsets.network_location import StaticNetworkLocationViewSet
from .viewsets.pinned_device import PinnedDeviceViewSet

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
