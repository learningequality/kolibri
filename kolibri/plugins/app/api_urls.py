from django.conf.urls import include
from django.conf.urls import url
from rest_framework import routers

from .api import AppCommandsViewset
from .api import InitializeAppView

router = routers.DefaultRouter()

router.register(r"appcommands", AppCommandsViewset, base_name="appcommands")

urlpatterns = [
    url(r"^", include(router.urls)),
    url(r"^initialize/([0-9a-f]{32})", InitializeAppView.as_view(), name="initialize"),
]
