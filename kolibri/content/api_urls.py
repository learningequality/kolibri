from django.conf.urls import include, url
from rest_framework import routers

from .api import ChannelMetadataCacheViewSet, ContentNodeViewset, ExamAssignmentViewset, ExamViewset, FileViewset, UserExamViewset

router = routers.SimpleRouter()
router.register('content', ChannelMetadataCacheViewSet, base_name="channel")

content_router = routers.SimpleRouter()
content_router.register(r'contentnode', ContentNodeViewset, base_name='contentnode')
content_router.register(r'file', FileViewset, base_name='file')
content_router.register(r'exam', ExamViewset, base_name='exam')
content_router.register(r'examassignment', ExamAssignmentViewset, base_name='examassignment')
content_router.register(r'userexam', UserExamViewset, base_name='userexam')

urlpatterns = [
    url(r'^', include(router.urls)),
    url(r'^content/(?P<channel_id>[^/.]+)/', include(content_router.urls)),
]
