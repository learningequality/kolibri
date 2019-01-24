from django.conf.urls import include
from django.conf.urls import url
from rest_framework import routers

from .api import ClassroomNotificationsViewset
from .api import LessonReportViewset
from .class_summary_api import ClassSummaryViewSet

router = routers.DefaultRouter()

router.register(r'lessonreport', LessonReportViewset, base_name='lessonreport')
router.register(r'classsummary', ClassSummaryViewSet, base_name='classsummary')
router.register(r'notifications', ClassroomNotificationsViewset, base_name='notifications')

urlpatterns = [
    url(r'^', include(router.urls))
]
