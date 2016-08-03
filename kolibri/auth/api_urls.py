from django.conf.urls import url
from rest_framework import routers

from .api import (
    ClassroomViewSet, CurrentFacilityViewSet, DeviceOwnerViewSet,
    FacilityUserViewSet, FacilityViewSet, LearnerGroupViewSet,
    MembershipViewSet, RoleViewSet, login_view, logout_view
)

router = routers.SimpleRouter()

router.register(r'facilityuser', FacilityUserViewSet)
router.register(r'deviceowner', DeviceOwnerViewSet)
router.register(r'membership', MembershipViewSet)
router.register(r'role', RoleViewSet)
router.register(r'facility', FacilityViewSet)
router.register(r'currentfacility', CurrentFacilityViewSet, base_name='currentfacility')
router.register(r'classroom', ClassroomViewSet)
router.register(r'learnergroup', LearnerGroupViewSet)

urlpatterns = [
    url(r'^login/$', login_view, name='login'),
    url(r'^logout/$', logout_view, name='logout'),
]

urlpatterns += router.urls
