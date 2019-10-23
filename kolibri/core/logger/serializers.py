from django.db.models import Sum
from django.utils.timezone import now
from le_utils.constants import content_kinds
from le_utils.constants import exercises
from rest_framework import serializers

from kolibri.core.auth.models import FacilityUser
from kolibri.core.logger.constants.exercise_attempts import MAPPING
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import ContentSessionLog
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.logger.models import ExamAttemptLog
from kolibri.core.logger.models import ExamLog
from kolibri.core.logger.models import MasteryLog
from kolibri.core.logger.models import UserSessionLog
from kolibri.core.notifications.api import create_examlog
from kolibri.core.notifications.api import create_summarylog
from kolibri.core.notifications.api import parse_attemptslog
from kolibri.core.notifications.api import create_examattemptslog
from kolibri.core.notifications.api import parse_examlog
from kolibri.core.notifications.api import parse_summarylog
from kolibri.core.notifications.tasks import wrap_to_save_queue
from kolibri.core.serializers import KolibriModelSerializer
from kolibri.utils.time_utils import local_now


class ContentSessionLogSerializer(KolibriModelSerializer):

    extra_fields = serializers.JSONField(default="{}")

    class Meta:
        model = ContentSessionLog
        fields = (
            "id",
            "user",
            "content_id",
            "channel_id",
            "start_timestamp",
            "end_timestamp",
            "time_spent",
            "kind",
            "extra_fields",
            "progress",
        )


class ExamLogSerializer(KolibriModelSerializer):
    progress = serializers.SerializerMethodField()
    score = serializers.SerializerMethodField()

    def get_progress(self, obj):
        return obj.attemptlogs.values_list("item").distinct().count()

    def get_score(self, obj):
        return (
            obj.attemptlogs.values_list("item")
            .order_by("completion_timestamp")
            .distinct()
            .aggregate(Sum("correct"))
            .get("correct__sum")
        )

    class Meta:
        model = ExamLog
        fields = (
            "id",
            "exam",
            "user",
            "closed",
            "progress",
            "score",
            "completion_timestamp",
        )
        read_only_fields = ("completion_timestamp",)

    def update(self, instance, validated_data):
        # This has changed, set the completion timestamp
        if validated_data.get("closed") and not instance.closed:
            instance.completion_timestamp = now()
        instance = super(ExamLogSerializer, self).update(instance, validated_data)
        # to check if a notification must be created:
        wrap_to_save_queue(parse_examlog, instance, local_now())
        return instance

    def create(self, validated_data):
        instance = super(ExamLogSerializer, self).create(validated_data)
        # to check if a notification must be created:
        wrap_to_save_queue(create_examlog, instance, local_now())
        return instance


class MasteryLogSerializer(KolibriModelSerializer):

    pastattempts = serializers.SerializerMethodField()
    totalattempts = serializers.SerializerMethodField()
    mastery_criterion = serializers.JSONField(default="{}")
    update_fields = ("pastattempts",)

    class Meta:
        model = MasteryLog
        fields = (
            "id",
            "summarylog",
            "start_timestamp",
            "pastattempts",
            "totalattempts",
            "user",
            "end_timestamp",
            "completion_timestamp",
            "mastery_criterion",
            "mastery_level",
            "complete",
        )

    def get_pastattempts(self, obj):
        mastery_criterion = obj.mastery_criterion
        exercise_type = mastery_criterion.get("type")
        attemptlogs = (
            AttemptLog.objects.filter(masterylog__summarylog=obj.summarylog)
            .values("correct", "hinted", "error")
            .order_by("-start_timestamp")
        )

        # get the first x logs depending on the exercise type
        if exercise_type == exercises.M_OF_N:
            return attemptlogs[: mastery_criterion["n"]]
        elif MAPPING.get(exercise_type):
            return attemptlogs[: MAPPING.get(exercise_type)]
        else:
            return attemptlogs[:10]

    def get_totalattempts(self, obj):
        return AttemptLog.objects.filter(masterylog__summarylog=obj.summarylog).count()


class AttemptLogSerializer(KolibriModelSerializer):
    answer = serializers.JSONField(default="{}")
    interaction_history = serializers.JSONField(default="[]")

    class Meta:
        model = AttemptLog
        fields = (
            "id",
            "masterylog",
            "start_timestamp",
            "sessionlog",
            "end_timestamp",
            "completion_timestamp",
            "item",
            "time_spent",
            "user",
            "complete",
            "correct",
            "hinted",
            "answer",
            "simple_answer",
            "interaction_history",
            "error",
        )

    def create(self, validated_data):
        instance = super(AttemptLogSerializer, self).create(validated_data)
        # to check if a notification must be created:
        wrap_to_save_queue(parse_attemptslog, instance)
        return instance

    def update(self, instance, validated_data):
        instance = super(AttemptLogSerializer, self).update(instance, validated_data)
        # to check if a notification must be created:
        wrap_to_save_queue(parse_attemptslog, instance)
        return instance


class ExamAttemptLogSerializer(KolibriModelSerializer):
    answer = serializers.JSONField(default="{}", allow_null=True)
    interaction_history = serializers.JSONField(default="[]")

    class Meta:
        model = ExamAttemptLog
        fields = (
            "id",
            "examlog",
            "start_timestamp",
            "content_id",
            "end_timestamp",
            "completion_timestamp",
            "item",
            "time_spent",
            "user",
            "complete",
            "correct",
            "hinted",
            "answer",
            "simple_answer",
            "interaction_history",
        )

    def validate(self, data):
        # Only do this validation when both are being set
        # not necessary on PATCH, for example
        if data.get("examlog") and data.get("user"):
            try:
                if data["examlog"].user != data["user"]:
                    raise serializers.ValidationError(
                        "User field and user for related exam log are not the same"
                    )
            except ExamLog.DoesNotExist:
                raise serializers.ValidationError("Invalid exam log")
        return data

    def create(self, validated_data):
        instance = super(ExamAttemptLogSerializer, self).create(validated_data)
        # to check if a notification must be created:
        wrap_to_save_queue(create_examattemptslog, instance.examlog, local_now())
        return instance


class ContentSummaryLogSerializer(KolibriModelSerializer):

    currentmasterylog = serializers.SerializerMethodField()
    extra_fields = serializers.JSONField(default="{}")
    update_fields = ()

    class Meta:
        model = ContentSummaryLog
        fields = (
            "id",
            "user",
            "content_id",
            "channel_id",
            "start_timestamp",
            "currentmasterylog",
            "end_timestamp",
            "completion_timestamp",
            "time_spent",
            "progress",
            "kind",
            "extra_fields",
        )

    def get_currentmasterylog(self, obj):
        try:
            current_log = obj.masterylogs.latest("end_timestamp")
            return MasteryLogSerializer(current_log).data
        except MasteryLog.DoesNotExist:
            return None

    def create(self, validated_data):
        instance = super(ContentSummaryLogSerializer, self).create(validated_data)
        # dont create notifications upon creating a summary log for an exercise
        # notifications should only be triggered upon first attempting a question in the exercise
        if instance.kind == content_kinds.EXERCISE:
            return instance
        # to check if a notification must be created:
        wrap_to_save_queue(create_summarylog, instance)
        return instance

    def update(self, instance, validated_data):
        instance = super(ContentSummaryLogSerializer, self).update(
            instance, validated_data
        )
        # to check if a notification must be created:
        wrap_to_save_queue(parse_summarylog, instance)
        return instance


class UserSessionLogSerializer(KolibriModelSerializer):

    update_fields = ()

    class Meta:
        model = UserSessionLog
        fields = (
            "id",
            "user",
            "channels",
            "start_timestamp",
            "last_interaction_timestamp",
            "pages",
        )


class TotalContentProgressSerializer(serializers.ModelSerializer):

    progress = serializers.SerializerMethodField()

    class Meta:
        model = FacilityUser
        fields = ("progress", "id")

    def get_progress(self, obj):
        return (
            obj.contentsummarylog_set.filter(progress=1)
            .aggregate(Sum("progress"))
            .get("progress__sum")
        )
