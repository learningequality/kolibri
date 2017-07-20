from rest_framework import routers

from .api import (
    AttemptLogViewSet, ContentSessionLogViewSet, ContentSummaryLogViewSet, ExamAttemptLogViewSet, ExamLogViewSet, MasteryLogViewSet,
    TotalContentProgressViewSet, UserSessionLogViewSet
)
from .csv import ContentSessionLogCSVExportViewSet, ContentSummaryLogCSVExportViewSet

router = routers.SimpleRouter()

router.register(r'contentsessionlog', ContentSessionLogViewSet, base_name='contentsessionlog')
router.register(r'contentsummarylog', ContentSummaryLogViewSet, base_name='contentsummarylog')
router.register(r'usersessionlog', UserSessionLogViewSet, base_name='usersessionlog')
router.register(r'masterylog', MasteryLogViewSet, base_name='masterylog')
router.register(r'attemptlog', AttemptLogViewSet, base_name='attemptlog')
router.register(r'examlog', ExamLogViewSet, base_name='examlog')
router.register(r'examattemptlog', ExamAttemptLogViewSet, base_name='examattemptlog')
router.register(r'userprogress', TotalContentProgressViewSet, base_name='userprogress')

router.register(r'contentsummarylogcsv', ContentSummaryLogCSVExportViewSet, base_name='contentsummarylogcsv')
router.register(r'contentsessionlogcsv', ContentSessionLogCSVExportViewSet, base_name='contentsessionlogcsv')

urlpatterns = router.urls
