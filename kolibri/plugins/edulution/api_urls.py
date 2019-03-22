from django.conf.urls import include
from django.conf.urls import url
from rest_framework import routers

from .viewsets import LearnerClassroomViewset, LearnerLessonViewset, KnowledgeMapViewset

router = routers.SimpleRouter()
router.register(r'learnerclassroom', LearnerClassroomViewset, base_name='learnerclassroom')
router.register(r'learnerlesson', LearnerLessonViewset, base_name='learnerlesson')
router.register(r'knowledgemap', KnowledgeMapViewset, base_name='knowledgemap')

urlpatterns = [
    url(r'^', include(router.urls)),
]
