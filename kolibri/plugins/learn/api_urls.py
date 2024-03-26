from django.urls import include
from django.urls import re_path
from rest_framework import routers

from .viewsets import LearnerClassroomViewset
from .viewsets import LearnerLessonViewset
from .viewsets import LearnHomePageHydrationView
from .viewsets import LearnStateView

router = routers.SimpleRouter()
router.register(
    r"learnerclassroom", LearnerClassroomViewset, basename="learnerclassroom"
)
router.register(r"learnerlesson", LearnerLessonViewset, basename="learnerlesson")


urlpatterns = [
    re_path(r"^", include(router.urls)),
    re_path(r"state", LearnStateView.as_view(), name="state"),
    re_path(r"homehydrate", LearnHomePageHydrationView.as_view(), name="homehydrate"),
]
