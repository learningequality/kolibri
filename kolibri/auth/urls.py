from rest_framework import routers

from .api import (
    ClassroomViewSet, DeviceOwnerViewSet, FacilityUserViewSet, FacilityViewSet,
    LearnerGroupViewSet, MembershipViewSet, RoleViewSet
)

router = routers.SimpleRouter()

router.register(r'facilityuser', FacilityUserViewSet)
router.register(r'deviceowner', DeviceOwnerViewSet)
router.register(r'membership', MembershipViewSet)
router.register(r'role', RoleViewSet)
router.register(r'facility', FacilityViewSet)
router.register(r'classroom', ClassroomViewSet)
router.register(r'learnergroup', LearnerGroupViewSet)

urlpatterns = router.urls
