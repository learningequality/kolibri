from django.conf.urls import url

from .viewsets import LoginMergedUserViewset
from .viewsets import OnMyOwnSetupViewset
from .viewsets import RemoteFacilityUserAuthenticatedViewset
from .viewsets import RemoteFacilityUserViewset

urlpatterns = [
    url(r"onmyownsetup", OnMyOwnSetupViewset.as_view(), name="onmyownsetup"),
    url(
        r"remotefacilityuser",
        RemoteFacilityUserViewset.as_view(),
        name="remotefacilityuser",
    ),
    url(
        r"remotefacilityauthenticateduserinfo",
        RemoteFacilityUserAuthenticatedViewset.as_view(),
        name="remotefacilityauthenticateduserinfo",
    ),
    url(
        r"loginmergeduser",
        LoginMergedUserViewset.as_view(),
        name="loginmergeduser",
    ),
]
