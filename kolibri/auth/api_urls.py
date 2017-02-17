from rest_framework import routers

from .api import (
    ClassroomViewSet, CurrentFacilityViewSet, DeviceOwnerViewSet, FacilityDatasetViewSet, FacilityUserViewSet,
    FacilityViewSet, LearnerGroupViewSet, MembershipViewSet, RoleViewSet, SessionViewSet, SignUpViewSet
)

router = routers.SimpleRouter()

router.register(r'facilitydataset', FacilityDatasetViewSet)
router.register(r'facilityuser', FacilityUserViewSet)
router.register(r'deviceowner', DeviceOwnerViewSet)
router.register(r'membership', MembershipViewSet)
router.register(r'role', RoleViewSet)
router.register(r'facility', FacilityViewSet)
router.register(r'currentfacility', CurrentFacilityViewSet, base_name='currentfacility')
router.register(r'session', SessionViewSet, base_name='session')
router.register(r'classroom', ClassroomViewSet)
router.register(r'learnergroup', LearnerGroupViewSet)
router.register(r'signup', SignUpViewSet, base_name='signup')

urlpatterns = router.urls
