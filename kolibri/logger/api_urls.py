from rest_framework import routers

from .api import AttemptLogViewSet, ContentRatingLogViewSet, ContentSessionLogViewSet, ContentSummaryLogViewSet, MasteryLogViewSet, UserSessionLogViewSet
from .csv import ContentSessionLogCSVExportViewSet, ContentSummaryLogCSVExportViewSet

router = routers.SimpleRouter()

router.register(r'contentsessionlog', ContentSessionLogViewSet)
router.register(r'contentsummarylog', ContentSummaryLogViewSet)
router.register(r'contentratinglog', ContentRatingLogViewSet)
router.register(r'usersessionlog', UserSessionLogViewSet)
router.register(r'masterylog', MasteryLogViewSet)
router.register(r'attemptlog', AttemptLogViewSet)

router.register(r'contentsummarylogcsv', ContentSummaryLogCSVExportViewSet, base_name='contentsummarylogcsv')
router.register(r'contentsessionlogcsv', ContentSessionLogCSVExportViewSet, base_name='contentsessionlogcsv')

urlpatterns = router.urls
