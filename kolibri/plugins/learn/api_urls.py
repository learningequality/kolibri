from django.conf.urls import include
from django.conf.urls import url
from rest_framework import routers

from .viewsets import LearnerClassroomViewset
from .viewsets import LearnerLessonViewset
from .viewsets import LearnHomePageHydrationView
from .viewsets import LearnStateView

router = routers.SimpleRouter()
router.register(
    r"learnerclassroom", LearnerClassroomViewset, base_name="learnerclassroom"
)
router.register(r"learnerlesson", LearnerLessonViewset, base_name="learnerlesson")


urlpatterns = [
    url(r"^", include(router.urls)),
    url(r"state", LearnStateView.as_view(), name="state"),
    url(r"homehydrate", LearnHomePageHydrationView.as_view(), name="homehydrate"),
]
