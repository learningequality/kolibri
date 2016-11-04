from django.conf.urls import include, url
from django.http import Http404
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

def return_404(*args, **kwargs):
    raise Http404

urlpatterns = [
    # e.g. http://localhost:8000/coach/api/f6d2f857af2e304093648daf2d8cacec/7df60789f1ef54fb8278558e5d021116/facility/1/userreport/
    # e.g. http://localhost:8000/coach/api/f6d2f857af2e304093648daf2d8cacec/7df60789f1ef54fb8278558e5d021116/facility/1/contentreport/
    # e.g. http://localhost:8000/coach/api/f6d2f857af2e304093648daf2d8cacec/7df60789f1ef54fb8278558e5d021116/facility/1/recentreport/
    url(r'^(?P<channel_id>[^/.]+)/(?P<content_node_id>[^/.]+)/(?P<collection_kind>[^/.]+)/(?P<collection_id>[^/.]+)/', include(reports_router.urls)),
    # e.g. http://localhost:8000/coach/api/f6d2f857af2e304093648daf2d8cacec/facility/1/contentsummary/7df60789f1ef54fb8278558e5d021116/
    url(r'^(?P<channel_id>[^/.]+)/(?P<collection_kind>[^/.]+)/(?P<collection_id>[^/.]+)/', include(content_summary_router.urls)),
    # e.g. http://localhost:8000/coach/api/f6d2f857af2e304093648daf2d8cacec/7df60789f1ef54fb8278558e5d021116/usersummary/1/
    url(r'^(?P<channel_id>[^/.]+)/(?P<content_node_id>[^/.]+)/', include(user_summary_router.urls)),
    url(r'^', return_404)
]
