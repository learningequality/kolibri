from django.db.models import Count
from django.db.models import F
from django.db.models import OuterRef
from django.db.models import Subquery
from django.db.models import Sum
from django.http import Http404
from rest_framework import permissions
from rest_framework import viewsets
from rest_framework.response import Response

from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.models import Collection
from kolibri.core.auth.models import FacilityUser
from kolibri.core.decorators import query_params_required
from kolibri.core.exams.models import Exam
from kolibri.core.lessons.models import Lesson
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import MasteryLog


class ExerciseDifficultiesPermissions(permissions.BasePermission):
    # check if requesting user has permission for collection or user
    def has_permission(self, request, view):
        classroom_id = request.GET.get("classroom_id", None)
        group_id = request.GET.get("group_id", None)
        collection_id = group_id or classroom_id
        lesson_id = request.GET.get("lesson_id", None)
        allowed_roles = [role_kinds.ADMIN, role_kinds.COACH]
        if lesson_id:
            try:
                lesson = Lesson.objects.get(id=lesson_id)
                classroom = lesson.collection
                return request.user.has_role_for(allowed_roles, classroom)
            except (
                FacilityUser.DoesNotExist,
                Collection.DoesNotExist,
                Lesson.DoesNotExist,
                ValueError,
            ):
                return False
        try:
            return request.user.has_role_for(
                allowed_roles, Collection.objects.get(pk=collection_id)
            )
        except (FacilityUser.DoesNotExist, Collection.DoesNotExist, ValueError):
            return False


# Define a base class so that the inherited class is properly introspectable,
# rather than being the result of our wrapping
@query_params_required(classroom_id=str)
class BaseExerciseDifficultQuestionsViewset(viewsets.ViewSet):
    pass


class ExerciseDifficultQuestionsViewset(BaseExerciseDifficultQuestionsViewset):
    permission_classes = (permissions.IsAuthenticated, ExerciseDifficultiesPermissions)

    def retrieve(self, request, pk):
        """
        Get the difficult questions for a particular exercise.
        pk maps to the content_id of the exercise in question.
        """
        classroom_id = request.GET.get("classroom_id", None)
        group_id = request.GET.get("group_id", None)
        lesson_id = request.GET.get("lesson_id", None)
        queryset = AttemptLog.objects.filter(
            FacilityUser.get_is_active_q("sessionlog"),
            masterylog__summarylog__content_id=pk,
        )
        if lesson_id is not None:
            collection_ids = Lesson.objects.get(
                id=lesson_id
            ).lesson_assignments.values_list("collection_id", flat=True)
            if group_id is not None:
                if (
                    group_id not in collection_ids
                    and classroom_id not in collection_ids
                ):
                    # In the special case that the group is not in the lesson assignments
                    # nor the containing classroom, just return an empty queryset.
                    queryset = AttemptLog.objects.none()
            else:
                # Only filter by all the collections in the lesson if we are not also
                # filtering by a specific group. Otherwise the group should be sufficient.
                queryset = queryset.filter(
                    user__memberships__collection_id__in=collection_ids
                )
        if group_id is not None:
            queryset = queryset.filter(user__memberships__collection_id=group_id)

        data = (
            # Use a subquery to prevent duplication of attempt logs due to the double JOIN
            # if we have multiple collections that a user is a member of
            AttemptLog.objects.filter(id__in=queryset.values_list("id", flat=True))
            .values("item")
            .annotate(
                total=Count(
                    "correct",
                )
            )
            .annotate(correct=Sum("correct"))
        )
        return Response(data)


class QuizDifficultiesPermissions(permissions.BasePermission):
    # check if requesting user has permission for collection or user
    def has_permission(self, request, view):
        exam_id = view.kwargs.get("pk", None)
        if exam_id is None:
            return False
        try:
            collection = Exam.objects.get(id=exam_id).collection
        except (Exam.DoesNotExist, ValueError):
            return False
        allowed_roles = [role_kinds.ADMIN, role_kinds.COACH]
        try:
            return request.user.has_role_for(allowed_roles, collection)
        except (FacilityUser.DoesNotExist, ValueError):
            return False


class QuizDifficultQuestionsViewset(viewsets.ViewSet):
    permission_classes = (permissions.IsAuthenticated, QuizDifficultiesPermissions)

    def retrieve(self, request, pk):
        """
        Get the difficult questions for a particular quiz.
        """
        group_id = request.GET.get("group_id", None)
        # Only return logs when the learner has submitted the Quiz OR
        # the coach has deactivated the Quiz. Do not return logs when Quiz is still
        # in-progress.
        try:
            quiz = Exam.objects.all().values("active", "collection_id").get(pk=pk)
        except Exam.DoesNotExist:
            raise Http404
        quiz_active = quiz["active"]
        queryset = AttemptLog.objects.filter(
            FacilityUser.get_is_active_q("sessionlog"),
            sessionlog__content_id=pk,
        )
        if quiz_active:
            queryset = queryset.filter(masterylog__complete=True)
        if group_id is not None:
            queryset = queryset.filter(
                user__memberships__collection_id=group_id
            ).distinct()
            collection_id = group_id
        else:
            collection_id = quiz["collection_id"]
        data = queryset.values("item").annotate(correct=Sum("correct"))

        # Instead of inferring the totals from the number of logs, use the total
        # number of people who submitted (if quiz is active) or started the exam
        # (if quiz is inactive) as our guide, as people who started the exam
        # but did not attempt the question are still important.
        total_queryset = MasteryLog.objects.filter(summarylog__content_id=pk)
        if quiz_active:
            total_queryset = total_queryset.filter(complete=True)
        total = (
            total_queryset.filter(user__memberships__collection_id=collection_id)
            .distinct()
            .count()
        )
        for datum in data:
            datum["total"] = total
        return Response(data)


class PracticeQuizDifficultQuestionsViewset(BaseExerciseDifficultQuestionsViewset):
    permission_classes = (permissions.IsAuthenticated, ExerciseDifficultiesPermissions)

    def retrieve(self, request, pk):
        """
        Get the difficult questions for a particular practice quiz.
        pk maps to the content_id of the practice quiz in question.
        """
        classroom_id = request.GET.get("classroom_id", None)
        group_id = request.GET.get("group_id", None)
        lesson_id = request.GET.get("lesson_id", None)
        # For practice quizzes we only look at complete MasteryLogs because there practice quiz
        # itself can never be made inactive, unlike for a coach assigned quiz (see above)
        masterylog_queryset = MasteryLog.objects.filter(
            summarylog__content_id=pk, complete=True, mastery_level__lt=0
        )
        attemptlog_queryset = AttemptLog.objects.all()
        if lesson_id is not None:
            collection_ids = Lesson.objects.get(
                id=lesson_id
            ).lesson_assignments.values_list("collection_id", flat=True)
            if group_id is not None:
                if (
                    group_id not in collection_ids
                    and classroom_id not in collection_ids
                ):
                    # In the special case that the group is not in the lesson assignments
                    # nor the containing classroom, just return an empty queryset.
                    attemptlog_queryset = AttemptLog.objects.none()
            else:
                # Only filter by all the collections in the lesson if we are not also
                # filtering by a specific group. Otherwise the group should be sufficient.
                masterylog_queryset = masterylog_queryset.filter(
                    user__memberships__collection_id__in=collection_ids
                )
        if group_id is not None:
            masterylog_queryset = masterylog_queryset.filter(
                user__memberships__collection_id=group_id
            )

        masterylog_queryset = masterylog_queryset.filter(
            id__in=Subquery(
                MasteryLog.objects.all()
                .order_by(F("completion_timestamp").desc(nulls_last=True))
                .filter(
                    user_id=OuterRef("user_id"),
                    summarylog__content_id=pk,
                    mastery_level__lt=0,
                    complete=True,
                )
                .values_list("id")[:1]
            )
        )

        masterylog_queryset = masterylog_queryset.values_list("id", flat=True)

        attemptlog_queryset = attemptlog_queryset.filter(
            masterylog_id__in=masterylog_queryset
        )

        data = attemptlog_queryset.values("item").annotate(correct=Sum("correct"))

        # Instead of inferring the totals from the number of attempt logs, use the total
        # number of people who have a completed try on the practice quiz
        total = masterylog_queryset.distinct().count()
        for datum in data:
            datum["total"] = total
        return Response(data)
