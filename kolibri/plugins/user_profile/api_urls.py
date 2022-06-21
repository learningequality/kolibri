from django.conf.urls import url

from .viewsets import RemoteFacilitiesViewset
from .viewsets import RemoteFacilityUserViewset
from .viewsets import UserIndividualViewset

urlpatterns = [
    url(r"userindividual", UserIndividualViewset.as_view(), name="userindividual"),
    url(
        r"remotefacilities", RemoteFacilitiesViewset.as_view(), name="remotefacilities"
    ),
    url(
        r"remotefacilityuser",
        RemoteFacilityUserViewset.as_view(),
        name="remotefacilityuser",
    ),
]
