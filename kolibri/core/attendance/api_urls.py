from django.urls import include
from django.urls import re_path
from rest_framework import routers

from .api import AttendanceSessionViewSet

router = routers.SimpleRouter()
router.register(
    r"attendancesession", AttendanceSessionViewSet, basename="attendancesession"
)

urlpatterns = [re_path(r"^", include(router.urls))]
