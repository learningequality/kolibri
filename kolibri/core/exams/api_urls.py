from django.conf.urls import include, url
from rest_framework import routers

from .api import ExamAssignmentViewset, ExamViewset, UserExamViewset

router = routers.SimpleRouter()
router.register(r'exam', ExamViewset, base_name='exam')
router.register(r'examassignment', ExamAssignmentViewset, base_name='examassignment')
router.register(r'userexam', UserExamViewset, base_name='userexam')

urlpatterns = [
    url(r'^', include(router.urls)),
]
