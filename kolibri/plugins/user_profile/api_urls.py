from django.urls import re_path

from .viewsets import LoginMergedUserViewset
from .viewsets import OnMyOwnSetupViewset
from .viewsets import RemoteFacilityUserAuthenticatedViewset
from .viewsets import RemoteFacilityUserViewset

urlpatterns = [
    re_path(r"onmyownsetup", OnMyOwnSetupViewset.as_view(), name="onmyownsetup"),
    re_path(
        r"remotefacilityuser",
        RemoteFacilityUserViewset.as_view(),
        name="remotefacilityuser",
    ),
    re_path(
        r"remotefacilityauthenticateduserinfo",
        RemoteFacilityUserAuthenticatedViewset.as_view(),
        name="remotefacilityauthenticateduserinfo",
    ),
    re_path(
        r"loginmergeduser",
        LoginMergedUserViewset.as_view(),
        name="loginmergeduser",
    ),
]
