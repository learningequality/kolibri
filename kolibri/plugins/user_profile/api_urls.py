from django.urls import re_path

from .viewsets.user_profile import LoginMergedUserViewset
from .viewsets.user_profile import OnMyOwnSetupViewset

urlpatterns = [
    re_path(r"onmyownsetup", OnMyOwnSetupViewset.as_view(), name="onmyownsetup"),
    re_path(
        r"loginmergeduser",
        LoginMergedUserViewset.as_view(),
        name="loginmergeduser",
    ),
]
