import logging
from datetime import timedelta
from itertools import groupby
from random import randint

from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.db.models import OuterRef
from django.db.models import Q
from django.db.models import Subquery
from django.db.models import Sum
from django.http import Http404
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from django_filters.rest_framework import UUIDFilter
from le_utils.constants import content_kinds
from le_utils.constants import exercises
from rest_framework import filters
from rest_framework import serializers
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .models import AttemptLog
from .models import ContentSessionLog
from .models import ContentSummaryLog
from .models import MasteryLog
from kolibri.core.api import ReadOnlyValuesViewset
from kolibri.core.auth.api import KolibriAuthPermissions
from kolibri.core.auth.api import KolibriAuthPermissionsFilter
from kolibri.core.auth.models import dataset_cache
from kolibri.core.content.api import OptionalPageNumberPagination
from kolibri.core.content.models import AssessmentMetaData
from kolibri.core.content.models import ContentNode
from kolibri.core.exams.models import Exam
from kolibri.core.lessons.models import Lesson
from kolibri.core.logger.constants import interaction_types
from kolibri.core.logger.constants.exercise_attempts import MAPPING
from kolibri.core.notifications.api import create_summarylog
from kolibri.core.notifications.api import parse_attemptslog
from kolibri.core.notifications.api import parse_summarylog
from kolibri.core.notifications.api import quiz_answered_notification
from kolibri.core.notifications.api import quiz_completed_notification
from kolibri.core.notifications.api import quiz_started_notification
from kolibri.core.notifications.tasks import wrap_to_save_queue
from kolibri.utils.time_utils import local_now

logger = logging.getLogger(__name__)


class HexStringUUIDField(serializers.UUIDField):
    def __init__(self, **kwargs):
        self.uuid_format = "hex"
        super(HexStringUUIDField, self).__init__(**kwargs)

    def to_internal_value(self, data):
        return super(HexStringUUIDField, self).to_internal_value(data).hex


class StartSessionSerializer(serializers.Serializer):
    lesson_id = HexStringUUIDField(required=False)
    node_id = HexStringUUIDField(required=False)
    # Do this as a special way of handling our coach generated quizzes
    quiz_id = HexStringUUIDField(required=False)
    # A flag to indicate whether to start the session over again
    repeat = serializers.BooleanField(required=False, default=False)

    def validate(self, data):
        if "quiz_id" in data and ("lesson_id" in data or "node_id" in data):
            raise ValidationError("quiz_id must not be mixed with other context")
        if "node_id" not in data and "quiz_id" not in data:
            raise ValidationError("node_id is required if not a coach assigned quiz")
        return data


class InteractionSerializer(serializers.Serializer):
    id = HexStringUUIDField(required=False)
    item = serializers.CharField()
    correct = serializers.FloatField(min_value=0, max_value=1)
    complete = serializers.BooleanField(required=False, default=False)
    time_spent = serializers.FloatField(min_value=0)

    answer = serializers.DictField(required=False)
    simple_answer = serializers.CharField(required=False, allow_blank=True)
    error = serializers.BooleanField(required=False, default=False)
    hinted = serializers.BooleanField(required=False, default=False)
    # Whether to replace the current answer with the new answer
    # this is a no-op if the attempt is being created.
    replace = serializers.BooleanField(required=False, default=False)

    def validate(self, data):
        if not data["error"] and "answer" not in data:
            raise ValidationError("Must provide an answer if not an error")
        return data


class UpdateSessionSerializer(serializers.Serializer):
    progress_delta = serializers.FloatField(min_value=0, max_value=1.0, required=False)
    progress = serializers.FloatField(min_value=0, max_value=1.0, required=False)
    time_spent_delta = serializers.FloatField(min_value=0, required=False)
    extra_fields = serializers.DictField(required=False)
    interactions = InteractionSerializer(required=False, many=True)

    def validate(self, data):
        if "progress_delta" in data and "progress" in data:
            raise ValidationError(
                "must not pass progress_delta and progress in the same request"
            )
        return data


# The lowest integer that can be encoded
# in a Django IntegerField across all backends
MIN_INTEGER = -2147483648


attemptlog_fields = [
    "id",
    "correct",
    "complete",
    "hinted",
    "error",
    "item",
    "answer",
    "time_spent",
]


class LogContext(object):
    """
    Object used to provide a limited dict like interface for encoding the
    context that can be stored in the sessionlog, and which is then
    returned to the frontend as part of the initialization of a content
    session.
    node_id - represents a specific ContentNode in a topic tree, while the
    content_id for that node is recorded directly on the sessionlog.
    quiz_id - represents the id of the Exam Model object that this session
    is regarding (if any).
    lesson_id - represents the id of the lesson this node_id is being engaged
    with from within (if any).
    mastery_level - represents the current 'try' at an assessment, whether an exercise
    a practice quiz or a coach assigned quiz. Different mastery_level values
    indicate a different try at the assessment.

    This is used to encode the values that are sent when initializing a session
    (see its use in the _get_context method below)
    and then also used to hold the values from an existing sessionlog when
    updating a session (see _update_session method).
    """

    __slots__ = "node_id", "quiz_id", "lesson_id", "mastery_level"

    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            self[key] = value

    def __setitem__(self, key, value):
        if key not in self.__slots__:
            return
        setattr(self, key, value)

    def __getitem__(self, key):
        if key not in self.__slots__:
            return
        return getattr(self, key, None)

    def __contains__(self, key):
        return key in self.__slots__ and hasattr(self, key)

    def to_dict(self):
        """
        Provide a dictionary of the keys stored in the context object.
        Used to serialize for inclusion in an API Response.
        """
        output = {}
        for slot in self.__slots__:
            if hasattr(self, slot):
                output[slot] = getattr(self, slot)
        return output


class ProgressTrackingViewSet(viewsets.GenericViewSet):
    def _precache_dataset_id(self, user):
        if user is None or user.is_anonymous():
            return
        key = ContentSessionLog.get_related_dataset_cache_key(
            user.id, user._meta.db_table
        )
        dataset_cache.set(key, user.dataset_id)

    def _check_quiz_permissions(self, user, quiz_id):
        if user.is_anonymous():
            raise PermissionDenied("Cannot access a quiz if not logged in")
        if not Exam.objects.filter(
            active=True,
            assignments__collection_id__in=user.memberships.all().values(
                "collection_id"
            ),
            id=quiz_id,
        ).exists():
            raise PermissionDenied("User does not have access to this quiz_id")

    def _check_lesson_permissions(self, user, lesson_id):
        if user.is_anonymous():
            raise PermissionDenied("Cannot access a lesson if not logged in")
        if not Lesson.objects.filter(
            lesson_assignments__collection_id__in=user.memberships.all().values(
                "collection_id"
            ),
            id=lesson_id,
        ).exists():
            raise ValidationError("Invalid lesson_id")

    def _get_context(self, user, validated_data):
        node_id = validated_data.get("node_id")
        quiz_id = validated_data.get("quiz_id")
        lesson_id = validated_data.get("lesson_id")

        context = LogContext()

        if node_id is not None:
            try:
                node = (
                    ContentNode.objects.annotate(
                        mastery_model=Subquery(
                            AssessmentMetaData.objects.filter(
                                contentnode_id=OuterRef("id")
                            ).values_list("mastery_model", flat=True)[:1]
                        )
                    )
                    .values("content_id", "channel_id", "kind", "mastery_model")
                    .get(id=node_id)
                )
                mastery_model = node["mastery_model"]
                content_id = node["content_id"]
                channel_id = node["channel_id"]
                kind = node["kind"]
                context["node_id"] = node_id
                if lesson_id:
                    self._check_lesson_permissions(user, lesson_id)
                    context["lesson_id"] = lesson_id
            except ContentNode.DoesNotExist:
                raise ValidationError("Invalid node_id")
        elif quiz_id is not None:
            self._check_quiz_permissions(user, quiz_id)
            mastery_model = {"type": "quiz", "coach_assigned": True}
            content_id = quiz_id
            channel_id = None
            kind = content_kinds.QUIZ
            context["quiz_id"] = quiz_id
        return content_id, channel_id, kind, mastery_model, context

    def _get_or_create_summarylog(
        self,
        user,
        content_id,
        channel_id,
        kind,
        mastery_model,
        start_timestamp,
        repeat,
        context,
    ):
        if not user:
            output = {
                "progress": 0,
                "extra_fields": {},
                "time_spent": 0,
                "complete": False,
            }
            if mastery_model:
                output.update(
                    {
                        "mastery_criterion": mastery_model,
                        "pastattempts": [],
                        "totalattempts": 0,
                        "complete": False,
                    }
                )
            return output

        try:
            summarylog = ContentSummaryLog.objects.get(
                content_id=content_id,
                user=user,
            )
            updated_fields = ("end_timestamp", "channel_id", "_morango_dirty_bit")
            if repeat:
                summarylog.progress = 0
                updated_fields += ("progress",)
            summarylog.channel_id = channel_id
            summarylog.end_timestamp = start_timestamp
            summarylog.save(update_fields=updated_fields)
        except ContentSummaryLog.DoesNotExist:
            summarylog = ContentSummaryLog.objects.create(
                content_id=content_id,
                user=user,
                channel_id=channel_id,
                kind=kind,
                start_timestamp=start_timestamp,
                end_timestamp=start_timestamp,
            )
            self._process_created_notification(summarylog, context)

        output = {
            "progress": summarylog.progress,
            "extra_fields": summarylog.extra_fields,
            "time_spent": summarylog.time_spent,
            "complete": summarylog.progress >= 1,
        }
        if mastery_model:
            assessment_output, mastery_level = self._start_assessment_session(
                mastery_model,
                summarylog,
                user,
                start_timestamp,
                repeat,
                context,
            )
            output.update(assessment_output)
            context["mastery_level"] = mastery_level
        return output

    def create(self, request):
        """
        Make a POST request to start a content session.

        Requires one of either:
        - node_id: the pk of the resource
        - quiz_id: the pk of the quiz (Exam) object

        Optional parameters:
        - repeat: whether to reset previous progress on this content to zero and start fresh
        - lesson_id: if this is being engaged within a lesson

        Returns object with properties:
        - session_id: id of the session object that was created by this call
        - context: contains node_id, quiz_id, lesson_id, and mastery_level as appropriate
        - progress: any previous progress on this content resource
        - time_spent: any previous time spent on this content resource
        - extra_fields: any previously recorded additional data stored for this resource
        - complete: whether this resource is completed by this user

        If this is an assessment, return object will also include:
        - mastery_criterion: mastery criterion that should be applied to determine completion
        - pastattempts: serialized subset of recent responses, used to determine completion
        - totalattempts: total number of previous responses within this run of the assessment resource
        """
        serializer = StartSessionSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        start_timestamp = local_now()
        repeat = serializer.validated_data["repeat"]

        content_id, channel_id, kind, mastery_model, context = self._get_context(
            request.user, serializer.validated_data
        )

        with transaction.atomic(), dataset_cache:

            user = None if request.user.is_anonymous() else request.user

            self._precache_dataset_id(user)

            output = self._get_or_create_summarylog(
                user,
                content_id,
                channel_id,
                kind,
                mastery_model,
                start_timestamp,
                repeat,
                context,
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
                kind=kind,
                visitor_id=visitor_id,
                extra_fields={"context": context.to_dict()},
            )
            output.update({"session_id": sessionlog.id, "context": context.to_dict()})
        return Response(output)

    def _process_created_notification(self, summarylog, context):
        # dont create notifications upon creating a summary log for an exercise
        # notifications should only be triggered upon first attempting a question in the exercise
        if "node_id" in context and summarylog.kind != content_kinds.EXERCISE:
            # We have sufficient information to only trigger notifications for the specific
            # lesson that this is being engaged with, but until we can work out the exact
            # way that we want to match this with contextual progress tracking, we are
            # not changing this for now.
            wrap_to_save_queue(
                create_summarylog,
                summarylog,
            )

    def _process_masterylog_created_notification(self, masterylog, context):
        if "quiz_id" in context:
            wrap_to_save_queue(
                quiz_started_notification, masterylog, context["quiz_id"]
            )

    def _check_quiz_log_permissions(self, masterylog):
        if (
            masterylog
            and masterylog.complete
            and masterylog.mastery_criterion.get("type") == "quiz"
            and masterylog.mastery_criterion.get("coach_assigned")
        ):
            raise PermissionDenied("Cannot update a finished coach assigned quiz")

    def _get_or_create_masterylog(
        self,
        user,
        summarylog,
        repeat,
        mastery_model,
        start_timestamp,
        context,
    ):
        masterylog = (
            MasteryLog.objects.filter(
                summarylog=summarylog,
                user=user,
            )
            .order_by("complete", "-end_timestamp")
            .first()
        )

        if masterylog is None or (masterylog.complete and repeat):
            # There is no previous masterylog, or the previous masterylog
            # is complete, and the request is requesting a new attempt.
            # Here we generate a mastery_level value - this serves to disambiguate multiple
            # retries at an assessment (either an exercise, practice quiz, or coach assigned quiz).
            # Having the same mastery_level/summarylog (and hence user) pair will result in the same
            # identifier being created. So if the same user engages with the same assessment on different
            # devices, when the data synchronizes, if the mastery_level is the same, this data will be
            # unified under a single try.
            if mastery_model.get("coach_assigned"):
                # To prevent coach assigned quiz mastery logs from propagating to older
                # Kolibri versions, we use negative mastery levels for these.
                # In older versions of Kolibri the mastery_level is validated to be
                # between 1 and 10 - so these values will fail validation and hence will
                # not be deserialized from the morango store.
                # We choose a random integer across the range of acceptable values,
                # in order to prevent collisions across multiple devices when users
                # start different tries of the same coach assigned quiz.
                # With a length of 9 digits for the decimal number, we would need approximately
                # 45 tries to have a 1 in a million chance of a collision.
                # Numbers derived using the formula for the generalized birthday problem:
                # https://en.wikipedia.org/wiki/Birthday_problem#The_generalized_birthday_problem
                # n=sqrt(2*d*ln(1/(1-p))
                # where d is the number of combinations of d digits, p is the probability
                # So for 9 digits, d = 10^9
                # p = 0.000001 for one in a million
                mastery_level = randint(MIN_INTEGER, -1)
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
        else:
            self._check_quiz_log_permissions(masterylog)
        return masterylog

    def _start_assessment_session(
        self, mastery_model, summarylog, user, start_timestamp, repeat, context
    ):
        masterylog = self._get_or_create_masterylog(
            user,
            summarylog,
            repeat,
            mastery_model,
            start_timestamp,
            context,
        )

        mastery_criterion = masterylog.mastery_criterion
        exercise_type = mastery_criterion.get("type")
        attemptlogs = masterylog.attemptlogs.values(*attemptlog_fields).order_by(
            "-start_timestamp"
        )

        # get the first x logs depending on the exercise type
        if exercise_type == exercises.M_OF_N:
            attemptlogs = attemptlogs[: mastery_criterion["n"]]
        elif exercise_type in MAPPING:
            attemptlogs = attemptlogs[: MAPPING[exercise_type]]
        elif exercise_type == "quiz":
            attemptlogs = attemptlogs.order_by()
        else:
            attemptlogs = attemptlogs[:10]

        return {
            "mastery_criterion": mastery_criterion,
            "pastattempts": attemptlogs,
            "totalattempts": masterylog.attemptlogs.count(),
            "complete": masterylog.complete,
        }, masterylog.mastery_level

    def _generate_interaction_summary(self, validated_data):
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
        self, user, complete, summarylog_id, end_timestamp, context
    ):
        if not user.is_anonymous() and context["mastery_level"] is not None:
            try:
                masterylog = MasteryLog.objects.get(
                    user=user,
                    mastery_level=context["mastery_level"],
                    summarylog_id=summarylog_id,
                )
                if complete and not masterylog.complete:
                    masterylog.complete = True
                    masterylog.completion_timestamp = end_timestamp
                    masterylog.save(
                        update_fields=(
                            "complete",
                            "completion_timestamp",
                            "_morango_dirty_bit",
                        )
                    )
                    self._process_masterylog_completed_notification(masterylog, context)
                else:
                    self._check_quiz_log_permissions(masterylog)
                return masterylog.id
            except MasteryLog.DoesNotExist:
                raise ValidationError(
                    "Invalid mastery_level value, this session has not been started."
                )

    def _update_attempt(self, attemptlog, interaction, update_fields, end_timestamp):

        interaction_summary = self._generate_interaction_summary(interaction)

        attemptlog.interaction_history += [interaction_summary]
        attemptlog.end_timestamp = end_timestamp
        attemptlog.time_spent = interaction["time_spent"]

        if interaction["error"] and not attemptlog.error:
            attemptlog.error = interaction["error"]
            update_fields.add("error")

        # Mark hinted only if it is not already correct, and don't undo previously hinted
        if interaction["hinted"] and not attemptlog.hinted and not attemptlog.correct:
            attemptlog.hinted = interaction["hinted"]
            update_fields.add("hinted")

        if interaction["replace"]:
            attemptlog.correct = interaction["correct"]
            update_fields.add("correct")

            if "answer" in interaction:
                attemptlog.answer = interaction["answer"]
                update_fields.add("answer")

            if "simple_answer" in interaction:
                attemptlog.simple_answer = interaction["simple_answer"]
                update_fields.add("simple_answer")

        if interaction["complete"] and not attemptlog.complete:
            attemptlog.complete = interaction["complete"]
            attemptlog.completion_timestamp = end_timestamp
            update_fields.update({"complete", "completion_timestamp"})

    def _create_attempt(
        self, session_id, masterylog_id, user, interaction, end_timestamp
    ):
        start_timestamp = end_timestamp - timedelta(seconds=interaction["time_spent"])

        interaction_summary = self._generate_interaction_summary(interaction)

        del interaction["replace"]

        return AttemptLog(
            sessionlog_id=session_id,
            masterylog_id=masterylog_id,
            interaction_history=[interaction_summary],
            user=user,
            start_timestamp=start_timestamp,
            completion_timestamp=end_timestamp if interaction["complete"] else None,
            end_timestamp=end_timestamp,
            **interaction
        )

    def _update_or_create_attempts(
        self, session_id, masterylog_id, user, interactions, end_timestamp, context
    ):
        user = None if user.is_anonymous() else user

        output = []

        for _, item_interactions in groupby(interactions, lambda x: x["item"]):
            created = False
            update_fields = {
                "interaction_history",
                "end_timestamp",
                "time_spent",
                "_morango_dirty_bit",
            }
            item_interactions = list(item_interactions)
            if "id" in item_interactions[0]:
                try:
                    attemptlog = AttemptLog.objects.get(
                        id=item_interactions[0]["id"],
                        masterylog_id=masterylog_id,
                        user=user,
                    )
                except AttemptLog.DoesNotExist:
                    raise ValidationError("Invalid attemptlog id specified")
            else:
                attemptlog = self._create_attempt(
                    session_id,
                    masterylog_id,
                    user,
                    item_interactions[0],
                    end_timestamp,
                )
                created = True
                item_interactions = item_interactions[1:]
            updated = bool(item_interactions)

            for response in item_interactions:
                self._update_attempt(attemptlog, response, update_fields, end_timestamp)

            self._process_attempt_notifications(
                attemptlog, context, user, created, updated
            )
            attemptlog.save(
                update_fields=None if created else update_fields, force_insert=created
            )
            attempt = {}
            for field in attemptlog_fields:
                attempt[field] = getattr(attemptlog, field)
            output.append(attempt)
        return {"attempts": output}

    def _process_attempt_notifications(
        self, attemptlog, context, user, created, updated
    ):
        if user is None:
            return
        if "lesson_id" in context:
            wrap_to_save_queue(parse_attemptslog, attemptlog)
        if created and "quiz_id" in context:
            wrap_to_save_queue(
                quiz_answered_notification, attemptlog, context["quiz_id"]
            )

    def _get_session_log(self, session_id, user):
        try:
            if user.is_anonymous():
                return ContentSessionLog.objects.get(id=session_id, user__isnull=True)
            else:
                return ContentSessionLog.objects.get(id=session_id, user=user)
        except ContentSessionLog.DoesNotExist:
            raise Http404(
                "ContentSessionLog with id {} does not exist".format(session_id)
            )

    def _normalize_progress(self, progress):
        return max(0, min(1.0, progress))

    def _update_content_log(self, log, end_timestamp, validated_data):
        update_fields = ("end_timestamp", "_morango_dirty_bit")

        log.end_timestamp = end_timestamp
        if "progress_delta" in validated_data:
            update_fields += ("progress",)
            log.progress = self._normalize_progress(
                log.progress + validated_data["progress_delta"]
            )
        elif "progress" in validated_data:
            update_fields += ("progress",)
            log.progress = self._normalize_progress(validated_data["progress"])
        if "time_spent_delta" in validated_data:
            update_fields += ("time_spent",)
            log.time_spent += validated_data["time_spent_delta"]
        return update_fields

    def _update_summary_log(
        self, user, sessionlog, end_timestamp, validated_data, context
    ):
        if user.is_anonymous():
            return
        summarylog = ContentSummaryLog.objects.get(
            content_id=sessionlog.content_id, user=user
        )
        was_complete = summarylog.progress >= 1

        update_fields = self._update_content_log(
            summarylog, end_timestamp, validated_data
        )

        if summarylog.progress >= 1 and not was_complete:
            summarylog.completion_timestamp = end_timestamp
            update_fields += ("completion_timestamp",)
            self._process_completed_notification(summarylog, context)
        if "extra_fields" in validated_data:
            update_fields += ("extra_fields",)
            summarylog.extra_fields = validated_data["extra_fields"]

        summarylog.save(update_fields=update_fields)
        return summarylog

    def _update_session(self, session_id, user, end_timestamp, validated_data):
        sessionlog = self._get_session_log(session_id, user)

        context = LogContext(**sessionlog.extra_fields.get("context", {}))

        if "quiz_id" in context:
            self._check_quiz_permissions(user, context["quiz_id"])

        update_fields = self._update_content_log(
            sessionlog, end_timestamp, validated_data
        )
        sessionlog.save(update_fields=update_fields)

        summarylog = self._update_summary_log(
            user, sessionlog, end_timestamp, validated_data, context
        )

        if summarylog is not None:
            complete = summarylog.progress >= 1
        else:
            complete = sessionlog.progress >= 1

        return {"complete": complete}, summarylog.id if summarylog else None, context

    def _process_completed_notification(self, summarylog, context):
        if "node_id" in context:
            wrap_to_save_queue(
                parse_summarylog,
                summarylog,
            )

    def update(self, request, pk=None):
        """
        Make a PUT request to update the current session

        Requires one of either:
        - progress_delta: increase the progress by this amount
        - progress: set the progress to this amount

        Can also update time spent recorded with a delta:
        - time_spent_delta: number of seconds to increase time_spent by

        And update the extra_fields value stored:
        - extra_fields: the complete representation to set extra_fields to

        If creating or updating attempts for an assessment must include:
        - interactions: an array of objects, if updating an existing attempt, must include attempt_id

        Returns an object with the properties:
        - complete: boolean indicating if the resource is completed

        If an attempt at an assessment was included, then this parameter will be included:
        - attempts: serialized form of the attempt, equivalent to that returned in pastattempts from
                  session initialization
        """
        if pk is None:
            raise Http404
        serializer = UpdateSessionSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        end_timestamp = local_now()
        validated_data = serializer.validated_data

        with transaction.atomic(), dataset_cache:
            self._precache_dataset_id(request.user)

            output, summarylog_id, context = self._update_session(
                pk, request.user, end_timestamp, validated_data
            )
            masterylog_id = self._update_and_return_mastery_log_id(
                request.user, output["complete"], summarylog_id, end_timestamp, context
            )
            if "interactions" in validated_data:
                attempt_output = self._update_or_create_attempts(
                    pk,
                    masterylog_id,
                    request.user,
                    validated_data["interactions"],
                    end_timestamp,
                    context,
                )
                output.update(attempt_output)
            return Response(output)


class TotalContentProgressViewSet(viewsets.GenericViewSet):
    def retrieve(self, request, pk=None):
        if request.user.is_anonymous() or pk != request.user.id:
            raise PermissionDenied("Can only access progress data for self")
        progress = (
            request.user.contentsummarylog_set.filter(progress=1)
            .aggregate(Sum("progress"))
            .get("progress__sum")
        )
        return Response(
            {
                "id": pk,
                "progress": progress,
            }
        )


class BaseLogFilter(FilterSet):
    facility = UUIDFilter(method="filter_facility")
    classroom = UUIDFilter(method="filter_classroom")
    learner_group = UUIDFilter(method="filter_learner_group")

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


class MasteryFilter(BaseLogFilter):
    content = UUIDFilter(name="summarylog__content_id")

    class Meta:
        model = MasteryLog
        fields = ["content"]


class MasteryLogViewSet(ReadOnlyValuesViewset):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
    queryset = MasteryLog.objects.all()
    pagination_class = OptionalPageNumberPagination
    filter_class = MasteryFilter
    values = (
        "user",
        "summarylog",
        "mastery_criterion",
        "start_timestamp",
        "end_timestamp",
        "completion_timestamp",
        "mastery_level",
        "complete",
    )


class AttemptFilter(BaseLogFilter):
    content = CharFilter(method="filter_content")

    def filter_content(self, queryset, name, value):
        return queryset.filter(masterylog__summarylog__content_id=value)

    class Meta:
        model = AttemptLog
        fields = ["masterylog", "complete", "user", "content", "item"]


class AttemptLogViewSet(ReadOnlyValuesViewset):
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (
        KolibriAuthPermissionsFilter,
        DjangoFilterBackend,
        filters.OrderingFilter,
    )
    queryset = AttemptLog.objects.all()
    pagination_class = OptionalPageNumberPagination
    filter_class = AttemptFilter
    ordering_fields = ("end_timestamp",)
    ordering = ("end_timestamp",)

    values = (
        "id",
        "item",
        "start_timestamp",
        "end_timestamp",
        "completion_timestamp",
        "time_spent",
        "complete",
        "correct",
        "hinted",
        "answer",
        "simple_answer",
        "interaction_history",
        "user",
        "error",
        "masterylog",
        "sessionlog",
    )
