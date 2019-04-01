from django.conf.urls import include
from django.conf.urls import url
from rest_framework import routers

from .viewsets import LessonViewset

router = routers.SimpleRouter()
router.register(r"lesson", LessonViewset, base_name="lesson")

urlpatterns = [url(r"^", include(router.urls))]
