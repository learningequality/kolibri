import logging

from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from django.db.models.query import Q
from django.db.utils import IntegrityError
from django.http import Http404
from django_filters import ModelChoiceFilter
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from le_utils.constants import content_kinds
from le_utils.constants import exercises
from rest_framework import filters
from rest_framework import serializers
from rest_framework import status
from rest_framework import viewsets
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
from kolibri.core.notifications.api import finish_lesson_resource
from kolibri.core.notifications.api import quiz_answered_notification
from kolibri.core.notifications.api import quiz_completed_notification
from kolibri.core.notifications.api import quiz_started_notification
from kolibri.core.notifications.api import start_lesson_assessment
from kolibri.core.notifications.api import start_lesson_resource
from kolibri.core.notifications.api import update_lesson_assessment
from kolibri.core.notifications.tasks import wrap_to_save_queue

logger = logging.getLogger(__name__)


QUIZ_ITEM_DELIMETER = ":"


class HexStringUUIDField(serializers.UUIDField):
    def __init__(self, **kwargs):
        self.uuid_format = "hex"
        super(HexStringUUIDField, self).__init__(**kwargs)

    def to_internal_value(self, data):
        return super(HexStringUUIDField, self).to_internal_value(data).hex


class ContextSerializer(serializers.Serializer):
    lesson_id = HexStringUUIDField(required=False)
    classroom_id = HexStringUUIDField(required=False)
    channel_id = HexStringUUIDField(required=False)
    topic_id = HexStringUUIDField(required=False)
    node_id = HexStringUUIDField(required=False)
    # Do this as a special way of handling our coach generated quizzes
    quiz_id = HexStringUUIDField(required=False)


class ProgressTrackingBaseSerializer(serializers.Serializer):
    context = ContextSerializer(required=False, default={})


class StartSessionSerializer(ProgressTrackingBaseSerializer):
    content_id = HexStringUUIDField()
    start_timestamp = serializers.DateTimeField()
    kind = serializers.CharField()
    assessment = serializers.BooleanField(required=False, default=False)
    # A flag to indicate whether to start the session over again
    repeat = serializers.BooleanField(required=False, default=False)

    def validate(self, data):
        if "quiz_id" in data["context"] and data["kind"] != content_kinds.QUIZ:
            raise ValidationError(
                "If using the quiz_id context, the quiz content kind must be used."
            )
        return data


class AttemptSerializer(serializers.Serializer):
    item_id = serializers.CharField(required=False)
    start_timestamp = serializers.DateTimeField(required=False)
    attempt_id = HexStringUUIDField(required=False)
    correct = serializers.FloatField(min_value=0, max_value=1)
    complete = serializers.BooleanField(required=False, default=False)
    time_spent = serializers.FloatField(min_value=0)

    answer = serializers.DictField(required=False)
    error = serializers.BooleanField(required=False, default=False)
    hinted = serializers.BooleanField(required=False, default=False)

    # An additional field that can be set to handle coach assigned quizzes
    # that are themselves not proper content nodes but refer to content under
    # the hood.
    content_id = HexStringUUIDField(required=False)

    def validate(self, data):
        if not data["error"] and "answer" not in data:
            raise ValidationError("Must provide an answer if not an error")
        if "attempt_id" not in data and "item_id" not in data:
            raise ValidationError("Must provide an attempt_id or item_id")
        if "attempt_id" not in data and "start_timestamp" not in data:
            raise ValidationError("Must provide a start_timestamp for a new attempt")
        return data


class UpdateSessionSerializer(ProgressTrackingBaseSerializer):
    end_timestamp = serializers.DateTimeField()
    progress_delta = serializers.FloatField(min_value=0, max_value=1.0, required=False)
    progress = serializers.FloatField(min_value=0, max_value=1.0, required=False)
    time_spent_delta = serializers.FloatField(min_value=0, required=False)
    extra_fields = serializers.DictField(required=False)
    attempt = AttemptSerializer(required=False)
    mastery_level = serializers.IntegerField(allow_null=True, default=None)

    def validate(self, data):
        if (
            data["mastery_level"] is None
            and "attempt" in data
            and not self.context["request"].user.is_anonymous()
        ):
            raise ValidationError(
                "mastery_level must be not null for non-anonymous attempts"
            )
        return data


class ProgressTrackingViewSet(viewsets.GenericViewSet):
    def create(self, request):
        serializer = StartSessionSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        content_id = serializer.validated_data["content_id"]
        assessment = serializer.validated_data["assessment"]
        start_timestamp = serializer.validated_data["start_timestamp"]
        kind = serializer.validated_data["kind"]
        repeat = serializer.validated_data["repeat"]
        context = serializer.validated_data["context"]

        channel_id = context.get("channel_id")
        if channel_id:
            channel_id = channel_id

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
                        content_id=content_id,
                        user=request.user,
                    )
                    updated_fields = ("end_timestamp", "channel_id")
                    if repeat:
                        summarylog.progress = 0
                        updated_fields += ("progress",)
                    summarylog.channel_id = channel_id
                    summarylog.end_timestamp = start_timestamp
                    summarylog.save(update_fields=updated_fields)
                except ContentSummaryLog.DoesNotExist:
                    summarylog = ContentSummaryLog.objects.create(
                        content_id=content_id,
                        user=request.user,
                        channel_id=channel_id,
                        kind=kind,
                        start_timestamp=start_timestamp,
                        end_timestamp=start_timestamp,
                    )
                    self._process_created_notification(summarylog, context)
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
                            repeat,
                            context,
                        )
                    )

            # Must ensure there is no user here to maintain user privacy for logging.
            visitor_id = (
                request.COOKIES.get("visitor_id")
                if hasattr(request, "COOKIES") and not user
                else None
            )
            sessionlog = ContentSessionLog.objects.create(
                content_id=content_id,
                channel_id=channel_id,
                start_timestamp=start_timestamp,
                end_timestamp=start_timestamp,
                user=user,
                visitor_id=visitor_id,
            )
            output.update({"session_id": sessionlog.id})
        return Response(output)

    def _process_created_notification(self, summarylog, context):
        # dont create notifications upon creating a summary log for an exercise
        # notifications should only be triggered upon first attempting a question in the exercise
        if (
            "lesson_id" in context
            and "node_id" in context
            and summarylog.kind != content_kinds.EXERCISE
        ):
            wrap_to_save_queue(
                start_lesson_resource,
                summarylog,
                context["node_id"],
                context["lesson_id"],
            )

    def _process_masterylog_created_notification(self, masterylog, context):
        if "quiz_id" in context:
            wrap_to_save_queue(
                quiz_started_notification, masterylog, context["quiz_id"]
            )

    def _get_or_create_masterylog(
        self,
        user,
        summarylog,
        repeat,
        coach_assigned_quiz,
        mastery_model,
        start_timestamp,
        context,
    ):
        masterylog = (
            MasteryLog.objects.filter(
                summarylog=summarylog,
                user=user,
            )
            .order_by("-complete", "-end_timestamp")
            .first()
        )

        if masterylog is None or (masterylog.complete and repeat):
            # There is no previous masterylog, or there is no incomplete
            # previous masterylog, and the request is requesting a new attempt.
            if coach_assigned_quiz:
                # To prevent coach assigned quiz mastery logs from propagating to older
                # Kolibri versions, we use negative mastery levels for these.
                mastery_level = (
                    masterylog.mastery_level - 1 if masterylog is not None else -1
                )
            else:
                mastery_level = (
                    masterylog.mastery_level + 1 if masterylog is not None else 1
                )

            masterylog = MasteryLog.objects.create(
                summarylog=summarylog,
                user=user,
                mastery_criterion=mastery_model,
                start_timestamp=start_timestamp,
                end_timestamp=start_timestamp,
                mastery_level=mastery_level,
            )
            self._process_masterylog_created_notification(masterylog, context)
        return masterylog

    def _start_assessment_session(
        self, content_id, summarylog, user, start_timestamp, repeat, context
    ):
        coach_assigned_quiz = "quiz_id" in context

        if coach_assigned_quiz:
            mastery_model = {"type": "quiz"}
        else:
            mastery_model = (
                AssessmentMetaData.objects.filter(contentnode__content_id=content_id)
                .values_list("mastery_model", flat=True)
                .first()
            )
        if mastery_model is None:
            raise ValidationError(
                "ContentNode with content_id {} is not an assessment".format(content_id)
            )

        masterylog = self._get_or_create_masterylog(
            user,
            summarylog,
            repeat,
            coach_assigned_quiz,
            mastery_model,
            start_timestamp,
            context,
        )

        mastery_criterion = masterylog.mastery_criterion
        exercise_type = mastery_criterion.get("type")
        attemptlogs = masterylog.attemptlogs.values(
            "correct", "hinted", "error"
        ).order_by("-start_timestamp")

        # get the first x logs depending on the exercise type
        if exercise_type == exercises.M_OF_N:
            attemptlogs = attemptlogs[: mastery_criterion["n"]]
        elif exercise_type in MAPPING:
            attemptlogs = attemptlogs[: MAPPING[exercise_type]]
        elif exercise_type == "quiz":
            attemptlogs = attemptlogs.order_by().values(
                "correct", "hinted", "error", "item", "answer", "time_spent"
            )
            if coach_assigned_quiz:
                for log in attemptlogs:
                    item_content_id, item = log["item"].split(QUIZ_ITEM_DELIMETER)
                    log["content_id"] = item_content_id
                    log["item"] = item
        else:
            attemptlogs = attemptlogs[:10]

        return {
            "mastery_criterion": mastery_criterion,
            "mastery_level": masterylog.mastery_level,
            "pastattempts": attemptlogs,
            "totalattempts": masterylog.attemptlogs.count(),
        }

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

    def _process_masterylog_completed_notification(self, masterylog, context):
        if "quiz_id" in context:
            wrap_to_save_queue(
                quiz_completed_notification, masterylog, context["quiz_id"]
            )

    def _update_and_return_mastery_log_id(
        self, user, complete, summarylog_id, validated_data
    ):
        if not user.is_anonymous() and validated_data["mastery_level"] is not None:
            try:
                masterylog = MasteryLog.objects.get(
                    user=user,
                    mastery_level=validated_data["mastery_level"],
                    summarylog_id=summarylog_id,
                )
                if complete and not masterylog.complete:
                    masterylog.complete = True
                    masterylog.completion_timestamp = validated_data["end_timestamp"]
                    masterylog.save(update_fields=("complete", "completion_timestamp"))
                    self._process_masterylog_completed_notification(
                        masterylog, validated_data["context"]
                    )
                return masterylog.id
            except MasteryLog.DoesNotExist:
                raise ValidationError(
                    "Invalid mastery_level value, this session has not been started."
                )

    def _update_or_create_attempt(
        self, session_id, masterylog_id, user, validated_data
    ):
        attempt = validated_data["attempt"]
        end_timestamp = validated_data["end_timestamp"]
        attempt_id = attempt.get("attempt_id")
        item_id = attempt.get("item_id")
        start_timestamp = attempt.get("start_timestamp")

        correct = attempt["correct"]
        complete = attempt["complete"]

        answer = attempt.get("answer")
        error = attempt["error"]
        hinted = attempt["hinted"]
        time_spent = attempt["time_spent"]

        interaction = self._generate_interaction(attempt)

        user = None if user.is_anonymous() else user

        if attempt_id:
            try:
                attemptlog = AttemptLog.objects.get(
                    id=attempt_id,
                    sessionlog_id=session_id,
                    masterylog_id=masterylog_id,
                    user=user,
                )
            except AttemptLog.DoesNotExist:
                raise ValidationError("Invalid attempt_id specified")
            attemptlog.interaction_history += [interaction]
            attemptlog.end_timestamp = end_timestamp
            attemptlog.time_spent = time_spent
            update_fields = ("interaction_history", "end_timestamp", "time_spent")

            for field in ("correct", "hinted", "error"):
                if not getattr(attemptlog, field) and attempt[field]:
                    setattr(attemptlog, field, True)
                    update_fields += (field,)

            if answer:
                attemptlog.answer = answer
                update_fields += ("answer",)

            if complete and not attemptlog.complete:
                attemptlog.complete = complete
                attemptlog.completion_timestamp = end_timestamp
                update_fields += (
                    "complete",
                    "completion_timestamp",
                )

            attemptlog.save(update_fields=update_fields)
            self._process_attempt_updated_notification(
                attemptlog, validated_data["context"]
            )
        else:
            if "quiz_id" in validated_data["context"] and "content_id" in attempt:
                # Store the content_id for this specific question and the item
                # together, to allow coach assigned quizzes to be stored seamlessly.
                item_id = "{}{}{}".format(
                    attempt["content_id"], QUIZ_ITEM_DELIMETER, item_id
                )
            attemptlog = AttemptLog.objects.create(
                item=item_id,
                sessionlog_id=session_id,
                masterylog_id=masterylog_id,
                correct=correct,
                answer=answer or {},
                interaction_history=[interaction],
                hinted=hinted,
                error=error,
                user=user,
                complete=complete,
                time_spent=time_spent,
                start_timestamp=start_timestamp,
                completion_timestamp=end_timestamp if complete else None,
                end_timestamp=end_timestamp,
            )
            if user:
                self._process_attempt_created_notification(
                    attemptlog, validated_data["context"]
                )

        return {"attempt_id": attemptlog.id}

    def _process_attempt_created_notification(self, attemptlog, context):
        if "lesson_id" in context:
            wrap_to_save_queue(
                start_lesson_assessment,
                attemptlog,
                context["node_id"],
                context["lesson_id"],
            )
        if "quiz_id" in context:
            wrap_to_save_queue(
                quiz_answered_notification, attemptlog, context["quiz_id"]
            )

    def _process_attempt_updated_notification(self, attemptlog, context):
        if "lesson_id" in context:
            wrap_to_save_queue(
                update_lesson_assessment,
                attemptlog,
                context["node_id"],
                context["lesson_id"],
            )

    def _update_session(self, session_id, user, validated_data):  # noqa C901
        end_timestamp = validated_data["end_timestamp"]
        progress_delta = validated_data.get("progress_delta")
        progress = validated_data.get("progress")
        time_spent_delta = validated_data.get("time_spent_delta")
        extra_fields = validated_data.get("extra_fields")
        try:
            if user.is_anonymous():
                sessionlog = ContentSessionLog.objects.get(
                    id=session_id, user__isnull=True
                )
            else:
                sessionlog = ContentSessionLog.objects.get(id=session_id, user=user)
        except ContentSessionLog.DoesNotExist:
            raise Http404(
                "ContentSessionLog with id {} does not exist".format(session_id)
            )
        update_fields = tuple(
            filter(
                lambda x: x,
                (
                    "progress"
                    if progress_delta is not None or progress is not None
                    else None,
                    "time_spent" if time_spent_delta is not None else None,
                    "end_timestamp",
                ),
            )
        )
        if not user.is_anonymous():
            summarylog = ContentSummaryLog.objects.get(
                content_id=sessionlog.content_id, user=user
            )
        else:
            summarylog = None

        was_complete = summarylog and summarylog.progress >= 1

        summarylog_update_fields = update_fields

        sessionlog.end_timestamp = end_timestamp
        if summarylog:
            summarylog.end_timestamp = end_timestamp
        if progress_delta:
            sessionlog.progress = min(1.0, sessionlog.progress + progress_delta)
            if summarylog:
                summarylog.progress = min(1.0, summarylog.progress + progress_delta)
        elif progress is not None:
            sessionlog.progress = progress
            if summarylog:
                summarylog.progress = progress
        if time_spent_delta:
            sessionlog.time_spent += time_spent_delta
            if summarylog:
                summarylog.time_spent += time_spent_delta

        if summarylog and summarylog.progress >= 1 and not was_complete:
            summarylog.completion_timestamp = end_timestamp
            summarylog_update_fields = summarylog_update_fields + (
                "completion_timestamp",
            )
            self._process_completed_notification(summarylog, validated_data["context"])
        if summarylog and extra_fields:
            summarylog_update_fields += ("extra_fields",)
            summarylog.extra_fields = extra_fields

        sessionlog.save(update_fields=update_fields)
        if summarylog is not None:
            summarylog.save(update_fields=summarylog_update_fields)
            complete = summarylog.progress >= 1
        else:
            complete = sessionlog.progress >= 1

        return {"complete": complete}, summarylog.id if summarylog else None

    def _process_completed_notification(self, summarylog, context):
        if "lesson_id" in context:
            wrap_to_save_queue(
                finish_lesson_resource,
                summarylog,
                context["node_id"],
                context["lesson_id"],
            )

    def update(self, request, pk=None):
        if pk is None:
            raise Http404
        serializer = UpdateSessionSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data

        with transaction.atomic():
            output, summarylog_id = self._update_session(
                pk, request.user, validated_data
            )
            masterylog_id = self._update_and_return_mastery_log_id(
                request.user, output["complete"], summarylog_id, validated_data
            )
            if "attempt" in validated_data:
                attempt_output = self._update_or_create_attempt(
                    pk, masterylog_id, request.user, validated_data
                )
                output.update(attempt_output)
            return Response(output)


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
        return queryset.filter(
            Q(user__memberships__collection_id=value)
            | Q(user__memberships__collection__parent_id=value)
        )

    def filter_learner_group(self, queryset, name, value):
        return queryset.filter(user__memberships__collection_id=value)


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
        return queryset.filter(
            Q(user__memberships__collection_id=collection)
            | Q(user__memberships__collection__parent_id=collection)
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
