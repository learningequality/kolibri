from django.conf.urls import include
from django.conf.urls import url
from rest_framework import routers

from .api import ExamAssignmentViewset
from .api import ExamViewset
from .api import UserExamViewset

router = routers.SimpleRouter()
router.register(r'exam', ExamViewset, base_name='exam')
router.register(r'examassignment', ExamAssignmentViewset, base_name='examassignment')
router.register(r'userexam', UserExamViewset, base_name='userexam')

urlpatterns = [
    url(r'^', include(router.urls)),
]
