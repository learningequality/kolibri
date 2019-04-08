from django.conf.urls import include
from django.conf.urls import url
from rest_framework import routers

from .viewsets import LearnerClassroomViewset
from .viewsets import LearnerLessonViewset

router = routers.SimpleRouter()
router.register(
    r"learnerclassroom", LearnerClassroomViewset, base_name="learnerclassroom"
)
router.register(r"learnerlesson", LearnerLessonViewset, base_name="learnerlesson")

urlpatterns = [url(r"^", include(router.urls))]
