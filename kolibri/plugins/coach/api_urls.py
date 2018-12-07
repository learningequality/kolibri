from django.conf.urls import include
from django.conf.urls import url
from rest_framework import routers

from .api import ContentReportViewSet
from .api import ContentSummaryViewSet
from .api import LessonReportViewset
from .api import RecentReportViewSet
from .api import UserReportViewSet

router = routers.DefaultRouter()

router.register(r'userreport', UserReportViewSet, base_name='userreport')
router.register(r'contentreport', ContentReportViewSet, base_name='contentreport')
router.register(r'recentreport', RecentReportViewSet, base_name='recentreport')

router.register(r'contentsummary', ContentSummaryViewSet, base_name='contentsummary')

router.register(r'lessonreport', LessonReportViewset, base_name='lessonreport')


urlpatterns = [
    url(r'^', include(router.urls))
]
