from django.urls import include
from django.urls import re_path
from rest_framework import routers

from .api import AttendanceRecordViewSet
from .api import AttendanceSessionViewSet

router = routers.SimpleRouter()
router.register(
    r"attendancesession", AttendanceSessionViewSet, basename="attendancesession"
)
router.register(
    r"attendancerecord", AttendanceRecordViewSet, basename="attendancerecord"
)

urlpatterns = [re_path(r"^", include(router.urls))]
