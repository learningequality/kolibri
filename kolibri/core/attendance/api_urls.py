from rest_framework import routers

from .viewsets import AttendanceRecordViewset
from .viewsets import AttendanceSessionViewset

router = routers.SimpleRouter()

router.register(r"session", AttendanceSessionViewset, basename="attendancesession")
router.register(r"record", AttendanceRecordViewset, basename="attendancerecord")

urlpatterns = router.urls
