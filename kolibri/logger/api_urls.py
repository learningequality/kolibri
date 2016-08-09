from rest_framework import routers

from .api import ContentRatingLogViewSet, ContentSessionLogViewSet, ContentSummaryLogViewSet, UserSessionLogViewSet
from .csv import ContentSummaryLogCSVExportViewSet

router = routers.SimpleRouter()

router.register(r'ContentSessionLog', ContentSessionLogViewSet)
router.register(r'contentsummarylog', ContentSummaryLogViewSet)
router.register(r'contentratinglog', ContentRatingLogViewSet)
router.register(r'usersessionlog', UserSessionLogViewSet)

router.register(r'contentsummarylogcsv', ContentSummaryLogCSVExportViewSet, base_name='contentsummarylogcsv')

urlpatterns = router.urls
