from django.urls import include
from django.urls import re_path
from rest_framework import routers

from .viewsets import LearnHomePageHydrationView
from .viewsets import LearnStateView
from .viewsets.classroom import LearnerClassroomViewset
from .viewsets.course import LearnerCourseViewset
from .viewsets.lesson import LearnerLessonViewset

router = routers.SimpleRouter()
router.register(
    r"learnerclassroom", LearnerClassroomViewset, basename="learnerclassroom"
)
router.register(r"learnerlesson", LearnerLessonViewset, basename="learnerlesson")
router.register(r"learnercourse", LearnerCourseViewset, basename="learnercourse")


urlpatterns = [
    re_path(r"^", include(router.urls)),
    re_path(r"state", LearnStateView.as_view(), name="state"),
    re_path(r"homehydrate", LearnHomePageHydrationView.as_view(), name="homehydrate"),
]
