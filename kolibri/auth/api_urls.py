from kolibri.core.routers import BulkDeleteRouter
from rest_framework import routers

from .api import (
    ClassroomViewSet, CurrentFacilityViewSet, FacilityDatasetViewSet, FacilityUsernameViewSet, FacilityUserViewSet, FacilityViewSet, LearnerGroupViewSet,
    MembershipViewSet, PublicFacilityViewSet, RoleViewSet, SessionViewSet, SignUpViewSet
)

router = routers.SimpleRouter()

router.register(r'facilitydataset', FacilityDatasetViewSet, base_name='facilitydataset')
router.register(r'facilityuser', FacilityUserViewSet, base_name='facilityuser')
router.register(r'facilityusername', FacilityUsernameViewSet, base_name='facilityusername')
router.register(r'role', RoleViewSet, base_name='role')
router.register(r'facility', FacilityViewSet, base_name='facility')
router.register(r'currentfacility', CurrentFacilityViewSet, base_name='currentfacility')
router.register(r'session', SessionViewSet, base_name='session')
router.register(r'classroom', ClassroomViewSet, base_name='classroom')
router.register(r'learnergroup', LearnerGroupViewSet, base_name='learnergroup')
router.register(r'signup', SignUpViewSet, base_name='signup')

router.register(r'public/v1/facility', PublicFacilityViewSet, base_name='publicfacility')

bulk_delete_router = BulkDeleteRouter()

bulk_delete_router.register(r'membership', MembershipViewSet, base_name='membership')

urlpatterns = router.urls + bulk_delete_router.urls
