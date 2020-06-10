from rest_framework import routers

from .api import DynamicNetworkLocationViewSet
from .api import NetworkLocationFacilitiesView
from .api import NetworkLocationViewSet
from .api import StaticNetworkLocationViewSet

router = routers.SimpleRouter()

router.register(r"networklocation", NetworkLocationViewSet, base_name="networklocation")
router.register(
    r"staticnetworklocation",
    StaticNetworkLocationViewSet,
    base_name="staticnetworklocation",
)
router.register(
    r"dynamicnetworklocation",
    DynamicNetworkLocationViewSet,
    base_name="dynamicnetworklocation",
)

router.register(
    r"networklocation_facilities",
    NetworkLocationFacilitiesView,
    basename="networklocation_facilities",
)

urlpatterns = router.urls
