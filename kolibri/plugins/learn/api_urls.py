from django.conf.urls import include
from django.conf.urls import url
from rest_framework import routers
from .viewsets import LearnerClassroomViewset

router = routers.SimpleRouter()
router.register(r'learnerclassroom', LearnerClassroomViewset, base_name='learnerclassroom')

urlpatterns = [
    url(r'^', include(router.urls)),
]
