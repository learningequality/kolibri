from django.urls import include
from django.urls import re_path
from rest_framework import routers

from .viewsets.class_summary import ClassSummaryViewSet
from .viewsets.classroom_notifications import ClassroomNotificationsViewset
from .viewsets.difficult_questions import ExerciseDifficultQuestionsViewset
from .viewsets.difficult_questions import PracticeQuizDifficultQuestionsViewset
from .viewsets.difficult_questions import QuizDifficultQuestionsViewset
from .viewsets.lesson_report import LessonReportViewset
from .viewsets.unit_lesson_progress import UnitLessonProgressViewSet
from .viewsets.unit_report import UnitReportViewSet

router = routers.DefaultRouter()

router.register(r"lessonreport", LessonReportViewset, basename="lessonreport")
router.register(r"classsummary", ClassSummaryViewSet, basename="classsummary")
router.register(
    r"notifications", ClassroomNotificationsViewset, basename="notifications"
)
router.register(
    r"exercisedifficulties",
    ExerciseDifficultQuestionsViewset,
    basename="exercisedifficulties",
)
router.register(
    r"quizdifficulties", QuizDifficultQuestionsViewset, basename="quizdifficulties"
)
router.register(
    r"practicequizdifficulties",
    PracticeQuizDifficultQuestionsViewset,
    basename="practicequizdifficulties",
)

urlpatterns = [
    re_path(r"^", include(router.urls)),
    re_path(
        r"^coursesession/(?P<course_session_id>[0-9a-fA-F]{32})/unit/(?P<unit_contentnode_id>[0-9a-fA-F]{32})/report/$",
        UnitReportViewSet.as_view({"get": "retrieve"}),
        name="unitreport",
    ),
    re_path(
        r"^coursesession/(?P<course_session_id>[0-9a-fA-F]{32})/unit/(?P<unit_contentnode_id>[0-9a-fA-F]{32})/lessonprogress/$",
        UnitLessonProgressViewSet.as_view({"get": "retrieve"}),
        name="unit_lesson_progress",
    ),
]
