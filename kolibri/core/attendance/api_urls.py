from django.urls import include
from django.urls import re_path
from rest_framework import routers

from .viewsets.attendance_record import AttendanceRecordViewSet
from .viewsets.attendance_session import AttendanceSessionViewSet

router = routers.SimpleRouter()
router.register(
    r"attendancesession", AttendanceSessionViewSet, basename="attendancesession"
)
router.register(
    r"attendancerecord", AttendanceRecordViewSet, basename="attendancerecord"
)

urlpatterns = [re_path(r"^", include(router.urls))]
