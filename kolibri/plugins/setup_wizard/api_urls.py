from django.conf.urls import include
from django.conf.urls import url
from rest_framework import routers

from .api import FacilityAdminView

router = routers.DefaultRouter()

router.register(r"facilityadmins", FacilityAdminView, base_name="facilityadmins")

urlpatterns = [url(r"^", include(router.urls))]
