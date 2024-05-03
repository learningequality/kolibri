from django.urls import include
from django.urls import re_path
from rest_framework import routers

from .api import AppCommandsViewset
from .api import InitializeAppView

router = routers.DefaultRouter()

router.register(r"appcommands", AppCommandsViewset, basename="appcommands")

urlpatterns = [
    re_path(r"^", include(router.urls)),
    re_path(
        r"^initialize/([0-9a-f]{32})$", InitializeAppView.as_view(), name="initialize"
    ),
]
