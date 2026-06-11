from django.urls import include
from django.urls import re_path
from rest_framework import routers

from .viewsets.course_session import CourseSessionViewset

router = routers.SimpleRouter()
router.register(r"coursesession", CourseSessionViewset, basename="coursesession")

urlpatterns = [re_path(r"^", include(router.urls))]
