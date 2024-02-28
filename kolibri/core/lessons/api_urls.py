from django.urls import include
from django.urls import re_path
from rest_framework import routers

from .viewsets import LessonViewset

router = routers.SimpleRouter()
router.register(r"lesson", LessonViewset, basename="lesson")

urlpatterns = [re_path(r"^", include(router.urls))]
