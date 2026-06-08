from rest_framework import routers

from .viewsets import FacilityUsernameViewSet

router = routers.SimpleRouter()

router.register(
    r"facilityusername", FacilityUsernameViewSet, basename="facilityusername"
)

urlpatterns = router.urls
