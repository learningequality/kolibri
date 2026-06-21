from django.urls import re_path
from rest_framework import routers

from kolibri.core.api import KolibriDataPortalViewSet
from kolibri.core.routers import BulkDeleteRouter

from .viewsets.auth_views import DeleteImportedUserView
from .viewsets.auth_views import IsPINValidView
from .viewsets.auth_views import RemoteFacilityUserAuthenticatedViewset
from .viewsets.auth_views import RemoteFacilityUserViewset
from .viewsets.auth_views import SetNonSpecifiedPasswordView
from .viewsets.auth_views import UsernameAvailableView
from .viewsets.classroom import ClassroomViewSet
from .viewsets.facility import FacilityViewSet
from .viewsets.facility_dataset import FacilityDatasetViewSet
from .viewsets.facility_user import DeletedFacilityUserViewSet
from .viewsets.facility_user import FacilityUserViewSet
from .viewsets.learner_group import LearnerGroupViewSet
from .viewsets.membership import MembershipViewSet
from .viewsets.role import RoleViewSet
from .viewsets.session import SessionViewSet
from .viewsets.signup import SignUpViewSet

router = routers.SimpleRouter()

router.register(r"facilitydataset", FacilityDatasetViewSet, basename="facilitydataset")
router.register(r"facility", FacilityViewSet, basename="facility")
router.register(r"session", SessionViewSet, basename="session")
router.register(r"classroom", ClassroomViewSet, basename="classroom")
router.register(r"learnergroup", LearnerGroupViewSet, basename="learnergroup")
router.register(r"signup", SignUpViewSet, basename="signup")
router.register(r"portal", KolibriDataPortalViewSet, basename="portal")

bulk_delete_router = BulkDeleteRouter()

bulk_delete_router.register(
    r"facilityuser", FacilityUserViewSet, basename="facilityuser"
)
bulk_delete_router.register(
    r"deletedfacilityuser", DeletedFacilityUserViewSet, basename="deletedfacilityuser"
)
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
        re_path(
            r"^deleteimporteduser/(?P<user_id>[a-f0-9]{32})$",
            DeleteImportedUserView.as_view(),
            name="deleteimporteduser",
        ),
    ]
)
