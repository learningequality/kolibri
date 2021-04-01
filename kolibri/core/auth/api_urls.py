from django.conf.urls import url
from rest_framework import routers

from .api import ClassroomViewSet
from .api import ExistingUsernameView
from .api import FacilityDatasetViewSet
from .api import FacilityUsernameViewSet
from .api import FacilityUserViewSet
from .api import FacilityViewSet
from .api import LearnerGroupViewSet
from .api import MembershipViewSet
from .api import RoleViewSet
from .api import SessionViewSet
from .api import SetNonSpecifiedPasswordView
from .api import SignUpViewSet
from kolibri.core.api import KolibriDataPortalViewSet
from kolibri.core.routers import BulkDeleteRouter

router = routers.SimpleRouter()

router.register(r"facilitydataset", FacilityDatasetViewSet, base_name="facilitydataset")
router.register(r"facilityuser", FacilityUserViewSet, base_name="facilityuser")
router.register(
    r"facilityusername", FacilityUsernameViewSet, base_name="facilityusername"
)
router.register(r"facility", FacilityViewSet, base_name="facility")
router.register(r"session", SessionViewSet, base_name="session")
router.register(r"classroom", ClassroomViewSet, base_name="classroom")
router.register(r"learnergroup", LearnerGroupViewSet, base_name="learnergroup")
router.register(r"signup", SignUpViewSet, base_name="signup")
router.register(r"portal", KolibriDataPortalViewSet, base_name="portal")

bulk_delete_router = BulkDeleteRouter()

bulk_delete_router.register(r"membership", MembershipViewSet, base_name="membership")
bulk_delete_router.register(r"role", RoleViewSet, base_name="role")

urlpatterns = (
    router.urls
    + bulk_delete_router.urls
    + [
        url(
            r"^setnonspecifiedpassword$",
            SetNonSpecifiedPasswordView.as_view(),
            name="setnonspecifiedpassword",
        ),
        url(
            r"^usernameexists$",
            ExistingUsernameView.as_view(),
            name="usernameexists",
        ),
    ]
)
