from django.conf.urls import url

from .viewsets import OnMyOwnSetupViewset
from .viewsets import RemoteFacilityUserViewset

urlpatterns = [
    url(r"onmyownsetup", OnMyOwnSetupViewset.as_view(), name="onmyownsetup"),
    url(
        r"remotefacilityuser",
        RemoteFacilityUserViewset.as_view(),
        name="remotefacilityuser",
    ),
]
