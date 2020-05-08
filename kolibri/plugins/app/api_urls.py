from django.conf.urls import include
from django.conf.urls import url
from rest_framework import routers

from .api import AppCommandsViewset

router = routers.DefaultRouter()

router.register(r"appcommands", AppCommandsViewset, base_name="appcommands")

urlpatterns = [url(r"^", include(router.urls))]
