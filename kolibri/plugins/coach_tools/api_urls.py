from django.conf.urls import include, url
from rest_framework import routers

from .api import ContentReportViewSet, ContentSummaryViewSet, RecentReportViewSet, UserReportViewSet, UserSummaryViewSet

reports_router = routers.SimpleRouter()

reports_router.register(r'userreport', UserReportViewSet, base_name='userreport')
reports_router.register(r'contentreport', ContentReportViewSet, base_name='contentreport')
reports_router.register(r'recentreport', RecentReportViewSet, base_name='recentreport')

content_summary_router = routers.SimpleRouter()
content_summary_router.register(r'contentsummary', ContentSummaryViewSet, base_name='contentsummary')

user_summary_router = routers.SimpleRouter()
user_summary_router.register(r'usersummary', UserSummaryViewSet, base_name='usersummary')


urlpatterns = [
    url(r'^(?P<channel_id>[^/.]+)/(?P<content_node_id>[^/.]+)/(?P<collection_kind>[^/.]+)/(?P<collection_id>[^/.]+)/', include(reports_router.urls)),
    url(r'^(?P<channel_id>[^/.]+)/(?P<collection_kind>[^/.]+)/(?P<collection_id>[^/.]+)/', include(content_summary_router.urls)),
    url(r'^(?P<channel_id>[^/.]+)/(?P<content_node_id>[^/.]+)/', include(user_summary_router.urls)),
]
