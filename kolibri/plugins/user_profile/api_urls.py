from django.conf.urls import url

from .viewsets import UserIndividualViewset

urlpatterns = [
    url(r"userindividual", UserIndividualViewset.as_view(), name="userindividual"),
]
