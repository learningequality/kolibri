from django.urls import re_path
from rest_framework import routers

from .api import ClassroomViewSet
from .api import FacilityDatasetViewSet
from .api import FacilityUsernameViewSet
from .api import FacilityUserViewSet
from .api import FacilityViewSet
from .api import IsPINValidView
from .api import LearnerGroupViewSet
from .api import MembershipViewSet
from .api import RemoteFacilityUserAuthenticatedViewset
from .api import RemoteFacilityUserViewset
from .api import RoleViewSet
from .api import SessionViewSet
from .api import SetNonSpecifiedPasswordView
from .api import SignUpViewSet
from .api import UsernameAvailableView
from kolibri.core.api import KolibriDataPortalViewSet
from kolibri.core.routers import BulkDeleteRouter

router = routers.SimpleRouter()

router.register(r"facilitydataset", FacilityDatasetViewSet, basename="facilitydataset")
router.register(r"facilityuser", FacilityUserViewSet, basename="facilityuser")
router.register(
    r"facilityusername", FacilityUsernameViewSet, basename="facilityusername"
)
router.register(r"facility", FacilityViewSet, basename="facility")
router.register(r"session", SessionViewSet, basename="session")
router.register(r"classroom", ClassroomViewSet, basename="classroom")
router.register(r"learnergroup", LearnerGroupViewSet, basename="learnergroup")
router.register(r"signup", SignUpViewSet, basename="signup")
router.register(r"portal", KolibriDataPortalViewSet, basename="portal")

bulk_delete_router = BulkDeleteRouter()

bulk_delete_router.register(r"membership", MembershipViewSet, basename="membership")
bulk_delete_router.register(r"role", RoleViewSet, basename="role")

urlpatterns = (
    router.urls
    + bulk_delete_router.urls
    + [
        re_path(
            r"^setnonspecifiedpassword$",
            SetNonSpecifiedPasswordView.as_view(),
            name="setnonspecifiedpassword",
        ),
        re_path(
            r"^usernameavailable$",
            UsernameAvailableView.as_view(),
            name="usernameavailable",
        ),
        re_path(
            r"^ispinvalid/(?P<pk>[a-f0-9]{32})$",
            IsPINValidView.as_view(),
            name="ispinvalid",
        ),
        re_path(
            r"^remotefacilityuser$",
            RemoteFacilityUserViewset.as_view(),
            name="remotefacilityuser",
        ),
        re_path(
            r"^remotefacilityauthenticateduserinfo$",
            RemoteFacilityUserAuthenticatedViewset.as_view(),
            name="remotefacilityauthenticateduserinfo",
        ),
    ]
)
