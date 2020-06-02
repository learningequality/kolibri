import logging

from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from django.db.models.query import F
from django.db.utils import IntegrityError
from django.http import Http404
from django_filters import ModelChoiceFilter
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from le_utils.constants import exercises
from rest_framework import filters
from rest_framework import serializers
from rest_framework import status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .models import AttemptLog
from .models import ContentSessionLog
from .models import ContentSummaryLog
from .models import ExamAttemptLog
from .models import ExamLog
from .models import MasteryLog
from .models import UserSessionLog
from .permissions import ExamActivePermissions
from .serializers import AttemptLogSerializer
from .serializers import ContentSessionLogSerializer
from .serializers import ContentSummaryLogSerializer
from .serializers import ExamAttemptLogSerializer
from .serializers import ExamLogSerializer
from .serializers import MasteryLogSerializer
from .serializers import TotalContentProgressSerializer
from .serializers import UserSessionLogSerializer
from kolibri.core.auth.api import KolibriAuthPermissions
from kolibri.core.auth.api import KolibriAuthPermissionsFilter
from kolibri.core.auth.filters import HierarchyRelationsFilter
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Collection
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import LearnerGroup
from kolibri.core.content.api import OptionalPageNumberPagination
from kolibri.core.content.models import AssessmentMetaData
from kolibri.core.exams.models import Exam
from kolibri.core.logger.constants import interaction_types
from kolibri.core.logger.constants.exercise_attempts import MAPPING

logger = logging.getLogger(__name__)


class ContextSerializer(serializers.Serializer):
    lesson_id = serializers.UUIDField(format="hex", required=False)
    classroom_id = serializers.UUIDField(format="hex", required=False)
    channel_id = serializers.UUIDField(format="hex", required=False)
    topic_id = serializers.UUIDField(format="hex", required=False)
    node_id = serializers.UUIDField(format="hex", required=False)


class LoggerActionBaseSerializer(serializers.Serializer):
    content_id = serializers.UUIDField(format="hex")
    context = ContextSerializer(required=False, default={})


class StartSessionSerializer(LoggerActionBaseSerializer):
    assessment = serializers.BooleanField()
    channel_id = serializers.UUIDField(format="hex")
    start_timestamp = serializers.DateTimeField()
    mastery_level = serializers.IntegerField(required=False, default=1)


class UpdateSessionSerializer(LoggerActionBaseSerializer):
    session_id = serializers.UUIDField(format="hex")
    end_timestamp = serializers.DateTimeField()
    progress_delta = serializers.FloatField(min_value=0, max_value=1.0, required=False)
    progress = serializers.FloatField(min_value=0, max_value=1.0, required=False)
    time_spent_delta = serializers.FloatField(min_value=0, required=False)
    extra_fields = serializers.DictField(required=False)


class AttemptMixin(object):
    correct = serializers.BooleanField(required=False, allow_null=True)
    complete = serializers.BooleanField(required=False, allow_null=True)
    time_spent = serializers.FloatField(min_value=0, required=False)
    mastery_level = serializers.IntegerField(required=False, default=1)

    answer = serializers.DictField(required=False, allow_null=True)
    error = serializers.BooleanField(required=False, allow_null=True)
    hinted = serializers.BooleanField(required=False, allow_null=True)

    def validate(self, data):
        if not data["error"] and not data["answer"]:
            raise ValidationError("Must provide an answer if not an error")
        return data


class StartAttemptSerializer(UpdateSessionSerializer, AttemptMixin):
    item_id = serializers.CharField()
    start_timestamp = serializers.DateTimeField()


class UpdateAttemptSerializer(UpdateSessionSerializer, AttemptMixin):
    attempt_id = serializers.UUIDField(format="hex")


logger_action = action(detail=False, methods=["post"])


class LoggerActionViewSet(viewsets.GenericViewSet):
    @logger_action
    def start_session(self, request):
        serializer = StartSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        content_id = serializer.validated_data["content_id"].hex
        assessment = serializer.validated_data["assessment"]
        channel_id = serializer.validated_data["channel_id"].hex
        start_timestamp = serializer.validated_data["start_timestamp"]
        mastery_level = serializer.validated_data["mastery_level"]

        output = {
            "progress": 0,
            "extra_fields": {},
        }

        with transaction.atomic():

            user = None

            if not request.user.is_anonymous():
                user = request.user
                try:
                    summarylog = ContentSummaryLog.objects.get(
                        content_id=content_id, user=request.user,
                    )
                    summarylog.end_timestamp = start_timestamp
                    summarylog.save(update_fields=("end_timestamp",))
                except ContentSummaryLog.DoesNotExist:
                    summarylog = ContentSummaryLog.objects.create(
                        content_id=content_id,
                        user=request.user,
                        channel_id=channel_id,
                        start_timestamp=start_timestamp,
                        end_timestamp=start_timestamp,
                    )
                output.update(
                    {
                        "progress": summarylog.progress,
                        "extra_fields": summarylog.extra_fields,
                    }
                )
                if assessment:
                    output.update(
                        self._start_assessment_session(
                            content_id,
                            summarylog,
                            request.user,
                            start_timestamp,
                            mastery_level,
                        )
                    )
            sessionlog = ContentSessionLog.objects.create(
                content_id=content_id,
                channel_id=channel_id,
                start_timestamp=start_timestamp,
                end_timestamp=start_timestamp,
                user=user,
            )
            output.update({"session_id": sessionlog.id})
        return Response(output)

    def _start_assessment_session(
        self, content_id, summarylog, user, start_timestamp, mastery_level
    ):
        mastery_model = (
            AssessmentMetaData.objects.filter(contentnode__content_id=content_id)
            .values_list("mastery_model", flat=True)
            .first()
        )
        if mastery_model is None:
            raise ValidationError(
                "ContentNode with content_id {} is not an assessment".format(content_id)
            )
        masterylog, _ = MasteryLog.objects.get_or_create(
            summarylog=summarylog,
            user=user,
            mastery_level=mastery_level,
            defaults={
                "mastery_criterion": mastery_model,
                "start_timestamp": start_timestamp,
                "end_timestamp": start_timestamp,
            },
        )
        mastery_criterion = masterylog.mastery_criterion
        exercise_type = mastery_criterion.get("type")
        attemptlogs = masterylog.attemptlogs.values(
            "correct", "hinted", "error"
        ).order_by("-start_timestamp")

        # get the first x logs depending on the exercise type
        if exercise_type == exercises.M_OF_N:
            attemptlogs = attemptlogs[: mastery_criterion["n"]]
        elif MAPPING.get(exercise_type):
            attemptlogs = attemptlogs[: MAPPING.get(exercise_type)]
        else:
            attemptlogs = attemptlogs[:10]

        return {
            "mastery_criterion": mastery_criterion,
            "mastery_level": masterylog.mastery_level,
            "pastattempts": attemptlogs,
            "totalattempts": masterylog.attemptlogs.count(),
        }

    def _do_summary_update(
        self, user, validated_data,
    ):
        content_id = validated_data["content_id"]
        end_timestamp = validated_data["end_timestamp"]
        progress_delta = validated_data["progress_delta"]
        progress = validated_data["progress"]
        time_spent_delta = validated_data["time_spent_delta"]
        extra_fields = validated_data["extra_fields"]
        summarylog = ContentSummaryLog.objects.get(content_id=content_id, user=user)
        update_fields = tuple(
            filter(
                lambda x: x,
                (
                    "progress" if progress_delta or progress else None,
                    "time_spent" if time_spent_delta else None,
                ),
            )
        )
        if extra_fields:
            update_fields += ("extra_fields",)
            summarylog.extra_fields = extra_fields
        if progress_delta:
            summarylog.progress += progress_delta
        elif progress is not None:
            summarylog.progress = progress
        summarylog.time_spent += time_spent_delta
        if end_timestamp > summarylog.end_timestamp:
            summarylog.end_timestamp = end_timestamp
            update_fields += ("end_timestamp",)
        if summarylog.progress >= 1 and not summarylog.complete:
            summarylog.complete = True
            summarylog.completion_timestamp = end_timestamp
            update_fields += (
                "complete",
                "completion_timestamp",
            )
        summarylog.save(update_fields=update_fields)
        return summarylog.complete

    def _do_session_update(self, request, validated_data):
        session_id = validated_data["session_id"]
        end_timestamp = validated_data["end_timestamp"]
        progress_delta = validated_data["progress_delta"]
        progress = validated_data["progress"]
        time_spent_delta = validated_data["time_spent_delta"]

        try:
            sessionlog = ContentSessionLog.objects.get(id=session_id)
        except ContentSessionLog.DoesNotExist:
            raise ValidationError(
                "ContentSessionLog with id {} does not exist".format(session_id)
            )
        update_fields = tuple(
            filter(
                lambda x: x,
                (
                    "progress" if progress_delta or progress else None,
                    "time_spent" if time_spent_delta else None,
                ),
            )
        )

        if progress_delta:
            sessionlog.progress += progress_delta
        elif progress is not None:
            sessionlog.progress = progress
        if time_spent_delta:
            sessionlog.time_spent += time_spent_delta
        if end_timestamp > sessionlog.end_timestamp:
            sessionlog.end_timestamp = end_timestamp
            update_fields += ("end_timestamp",)
        sessionlog.save(update_fields=update_fields)

        if not request.user.is_anonymous():
            complete = self._do_summary_update(request.user, validated_data)
        else:
            complete = sessionlog.progress >= 1
        return {"complete": complete}

    @logger_action
    def update_session(self, request, content_id, context):
        serializer = UpdateSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            return self._do_session_update(request, serializer.validated_data)

    def _generate_interaction(self, validated_data):
        if validated_data["error"]:
            return {
                "type": interaction_types.ERROR,
            }
        elif validated_data["hinted"]:
            return {
                "type": interaction_types.HINT,
                "answer": validated_data["answer"],
            }
        return {
            "type": interaction_types.ANSWER,
            "answer": validated_data["answer"],
            "correct": validated_data["correct"],
        }

    def _update_and_return_mastery_log(self, request, complete, validated_data):
        if not request.user.is_anonymous():
            masterylog = MasteryLog.objects.get(
                user=request.user, mastery_level=validated_data["mastery_level"],
            )
            if complete and not masterylog.complete:
                masterylog.complete = True
                masterylog.completion_timestamp = validated_data["end_timestamp"]
                masterylog.save(update_fields=("complete", "completion_timestamp"))
            return masterylog

    @logger_action
    def start_attempt(self, request, content_id, context):
        serializer = StartAttemptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        session_id = serializer.validated_data["session_id"]
        item_id = serializer.validated_data["item_id"]
        start_timestamp = serializer.validated_data["start_timestamp"]
        end_timestamp = serializer.validated_data["end_timestamp"]

        correct = serializer.validated_data["correct"]
        complete = serializer.validated_data["complete"]

        answer = serializer.validated_data["answer"]
        error = serializer.validated_data["error"]
        hinted = serializer.validated_data["hinted"]

        with transaction.atomic():
            output = self._do_session_update(request, serializer.validated_data)

            masterylog = self._update_and_return_mastery_log(
                request, output["complete"], serializer.validated_data
            )

            interaction = self._generate_interaction(serializer.validated_data)

            attempt = AttemptLog.objects.create(
                item=item_id,
                sessionlog_id=session_id,
                masterylog=masterylog,
                correct=correct,
                answer=answer,
                interaction_history=[interaction],
                hinted=hinted,
                error=error,
                user=request.user,
                complete=complete,
                start_timestamp=start_timestamp,
                completion_timestamp=end_timestamp if complete else None,
                end_timestamp=end_timestamp,
            )

            output.update({"attempt_id": attempt.id})

            return output

    @logger_action
    def update_attempt(self, request, content_id, context):
        serializer = UpdateAttemptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        attempt_id = serializer.validated_data["attempt_id"]
        end_timestamp = serializer.validated_data["end_timestamp"]

        complete = serializer.validated_data["complete"]

        with transaction.atomic():
            output = self._do_session_update(request, serializer.validated_data)

            self._update_and_return_mastery_log(
                request, output["complete"], serializer.validated_data
            )

            interaction = self._generate_interaction(serializer.validated_data)

            attempt = AttemptLog.objects.get(id=attempt_id)

            attempt.interaction_history += [interaction]
            update_fields = ("interaction_history",)

            if end_timestamp > attempt.end_timestamp:
                attempt.end_timestamp = end_timestamp
                update_fields += ("end_timestamp",)

            if complete and not attempt.complete:
                attempt.complete = complete
                attempt.completion_timestamp = end_timestamp
                update_fields += (
                    "complete",
                    "completion_timestamp",
                )

            return True


class BaseLogFilter(FilterSet):
    facility = ModelChoiceFilter(
        method="filter_facility", queryset=Facility.objects.all()
    )
    classroom = ModelChoiceFilter(
        method="filter_classroom", queryset=Classroom.objects.all()
    )
    learner_group = ModelChoiceFilter(
        method="filter_learner_group", queryset=LearnerGroup.objects.all()
    )

    # Only a superuser can filter by facilities
    def filter_facility(self, queryset, name, value):
        return queryset.filter(user__facility=value)

    def filter_classroom(self, queryset, name, value):
        return HierarchyRelationsFilter(queryset).filter_by_hierarchy(
            ancestor_collection=value, target_user=F("user")
        )

    def filter_learner_group(self, queryset, name, value):
        return HierarchyRelationsFilter(queryset).filter_by_hierarchy(
            ancestor_collection=value, target_user=F("user")
        )


class LoggerViewSet(viewsets.ModelViewSet):
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        model = self.queryset.model
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        try:
            instance = model.objects.get(id=self.kwargs[lookup_url_kwarg])
            self.check_object_permissions(request, instance)
        except (ValueError, ObjectDoesNotExist):
            raise Http404
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, "_prefetched_objects_cache", None):
            # If 'prefetch_related' has been applied to a queryset, we need to
            # forcibly invalidate the prefetch cache on the instance.
            instance._prefetched_objects_cache = {}
        default_response = dict(request.data)
        # First look if the computed fields to be updated are listed:
        updating_fields = getattr(serializer.root, "update_fields", None)
        # If not, fetch all the fields that are computed methods:
        if updating_fields is None:
            updating_fields = [
                field
                for field in serializer.fields
                if getattr(serializer.fields[field], "method_name", None)
            ]
        for field in updating_fields:
            method_name = getattr(serializer.fields[field], "method_name", None)
            if method_name:
                method = getattr(serializer.root, method_name)
                default_response[field] = method(instance)
        return Response(default_response)

    def create(self, request, *args, **kwargs):
        try:
            return super(LoggerViewSet, self).create(request, *args, **kwargs)
        except IntegrityError:
            # The object has been created previously: let's calculate its id and return it
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            obj = serializer.Meta.model(**serializer.validated_data)
            obj.id = obj.calculate_uuid()
            final_obj = self.get_serializer(obj)
            return Response(final_obj.data)
        except ValidationError as e:
            logger.error("Failed to validate data: {}".format(e))
            return Response(request.data, status.HTTP_400_BAD_REQUEST)


class ContentSessionLogFilter(BaseLogFilter):
    class Meta:
        model = ContentSessionLog
        fields = ["user_id", "content_id"]


class ContentSessionLogViewSet(LoggerViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    queryset = ContentSessionLog.objects.all()
    serializer_class = ContentSessionLogSerializer
    pagination_class = OptionalPageNumberPagination
    filter_class = ContentSessionLogFilter


class ContentSummaryLogFilter(BaseLogFilter):
    class Meta:
        model = ContentSummaryLog
        fields = ["user_id", "content_id"]


class ContentSummaryLogViewSet(LoggerViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    queryset = ContentSummaryLog.objects.all()
    serializer_class = ContentSummaryLogSerializer
    pagination_class = OptionalPageNumberPagination
    filter_class = ContentSummaryLogFilter


class TotalContentProgressViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter,)
    queryset = FacilityUser.objects.all()
    serializer_class = TotalContentProgressSerializer


class UserSessionLogFilter(BaseLogFilter):
    class Meta:
        model = UserSessionLog
        fields = ["user_id"]


class UserSessionLogViewSet(LoggerViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    queryset = UserSessionLog.objects.all()
    serializer_class = UserSessionLogSerializer
    pagination_class = OptionalPageNumberPagination
    filter_class = UserSessionLogFilter


class MasteryFilter(FilterSet):
    class Meta:
        model = MasteryLog
        fields = ["summarylog"]


class MasteryLogViewSet(LoggerViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    queryset = MasteryLog.objects.all()
    serializer_class = MasteryLogSerializer
    pagination_class = OptionalPageNumberPagination
    filter_class = MasteryFilter


class AttemptFilter(BaseLogFilter):
    content = CharFilter(method="filter_content")

    def filter_content(self, queryset, name, value):
        return queryset.filter(masterylog__summarylog__content_id=value)

    class Meta:
        model = AttemptLog
        fields = ["masterylog", "complete", "user", "content", "item"]


class AttemptLogViewSet(LoggerViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (
        KolibriAuthPermissionsFilter,
        DjangoFilterBackend,
        filters.OrderingFilter,
    )
    queryset = AttemptLog.objects.all()
    serializer_class = AttemptLogSerializer
    pagination_class = OptionalPageNumberPagination
    filter_class = AttemptFilter
    ordering_fields = ("end_timestamp",)
    ordering = ("end_timestamp",)


class ExamAttemptFilter(BaseLogFilter):
    exam = ModelChoiceFilter(method="filter_exam", queryset=Exam.objects.all())
    user = ModelChoiceFilter(method="filter_user", queryset=FacilityUser.objects.all())
    content = CharFilter(field_name="content_id")

    def filter_exam(self, queryset, name, value):
        return queryset.filter(examlog__exam=value)

    def filter_user(self, queryset, name, value):
        return queryset.filter(examlog__user=value)

    class Meta:
        model = ExamAttemptLog
        fields = ["examlog", "exam", "user", "content", "item"]


class ExamAttemptLogViewSet(LoggerViewSet):
    permission_classes = (ExamActivePermissions, KolibriAuthPermissions)
    filter_backends = (
        KolibriAuthPermissionsFilter,
        DjangoFilterBackend,
        filters.OrderingFilter,
    )
    queryset = ExamAttemptLog.objects.all()
    serializer_class = ExamAttemptLogSerializer
    pagination_class = OptionalPageNumberPagination
    filter_class = ExamAttemptFilter


class ExamLogFilter(BaseLogFilter):

    collection = ModelChoiceFilter(
        method="filter_collection", queryset=Collection.objects.all()
    )

    def filter_collection(self, queryset, name, collection):
        return HierarchyRelationsFilter(queryset).filter_by_hierarchy(
            target_user=F("user"), ancestor_collection=collection
        )

    class Meta:
        model = ExamLog
        fields = ["user", "exam"]


class ExamLogViewSet(viewsets.ModelViewSet):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    queryset = ExamLog.objects.all()
    serializer_class = ExamLogSerializer
    pagination_class = OptionalPageNumberPagination
    filter_class = ExamLogFilter
