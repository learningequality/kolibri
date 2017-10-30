"""
This app is intended to provide the core functionality for tracking user
engagement with content and Kolibri in general. As such, it is intended
to store details of user interactions with content, a summary of those
interactions, interactions with the software in general, as well as user
feedback on the content and the software.
"""

from __future__ import unicode_literals

from datetime import timedelta

from django.core.exceptions import ObjectDoesNotExist
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone
from jsonfield import JSONField
from kolibri.auth.constants import role_kinds
from kolibri.auth.models import AbstractFacilityDataModel, Facility, FacilityUser
from kolibri.auth.permissions.base import RoleBasedPermissions
from kolibri.auth.permissions.general import IsOwn
from kolibri.content.models import UUIDField
from kolibri.core.exams.models import Exam
from kolibri.core.fields import DateTimeTzField
from kolibri.utils.time import local_now
from morango.query import SyncableModelQuerySet

from .permissions import AnyoneCanWriteAnonymousLogs


class BaseLogQuerySet(SyncableModelQuerySet):

    def filter_by_topic(self, topic, content_id_lookup="content_id"):
        """
        Filter a set of logs by content_id, using content_ids from all descendants of specified topic.
        """

        content_ids = topic.get_descendant_content_ids()

        return self.filter_by_content_ids(content_ids)

    def filter_by_content_ids(self, content_ids, content_id_lookup="content_id"):
        """
        Filter a set of logs by content_id, using content_ids from the provided list or queryset.
        """
        return self.filter(**{content_id_lookup + "__in": content_ids})


def log_permissions(user_field):

    return (
        AnyoneCanWriteAnonymousLogs(field_name=user_field + '_id') |
        IsOwn(field_name=user_field + '_id') |
        RoleBasedPermissions(
            target_field=user_field,
            can_be_created_by=(role_kinds.ADMIN,),
            can_be_read_by=(role_kinds.ADMIN, role_kinds.COACH),
            can_be_updated_by=(role_kinds.ADMIN,),
            can_be_deleted_by=(role_kinds.ADMIN,),
        )
    )


class BaseLogModel(AbstractFacilityDataModel):

    permissions = log_permissions("user")

    class Meta:
        abstract = True

    def infer_dataset(self, *args, **kwargs):
        if self.user:
            return self.user.dataset
        else:
            facility = Facility.get_default_facility()
            assert facility, "Before you can save logs, you must have a facility"
            return facility.dataset

    objects = BaseLogQuerySet.as_manager()

    def calculate_partition(self):
        if self.user_id:
            return '{dataset_id}:user-rw:{user_id}'.format(dataset_id=self.dataset_id, user_id=self.user_id)
        else:
            return '{dataset_id}:anonymous'.format(dataset_id=self.dataset_id)


class ContentSessionLog(BaseLogModel):
    """
    This model provides a record of interactions with a content item within a single visit to that content page.
    """
    # Morango syncing settings
    morango_model_name = "contentsessionlog"

    user = models.ForeignKey(FacilityUser, blank=True, null=True)
    content_id = UUIDField(db_index=True)
    channel_id = UUIDField()
    start_timestamp = DateTimeTzField()
    end_timestamp = DateTimeTzField(blank=True, null=True)
    time_spent = models.FloatField(help_text="(in seconds)", default=0.0, validators=[MinValueValidator(0)])
    progress = models.FloatField(default=0, validators=[MinValueValidator(0)])
    kind = models.CharField(max_length=200)
    extra_fields = JSONField(default={}, blank=True)


class ContentSummaryLog(BaseLogModel):
    """
    This model provides a summary of all interactions a user has had with a content item.
    """
    # Morango syncing settings
    morango_model_name = "contentsummarylog"

    user = models.ForeignKey(FacilityUser)
    content_id = UUIDField(db_index=True)
    channel_id = UUIDField()
    start_timestamp = DateTimeTzField()
    end_timestamp = DateTimeTzField(blank=True, null=True)
    completion_timestamp = DateTimeTzField(blank=True, null=True)
    time_spent = models.FloatField(help_text="(in seconds)", default=0.0, validators=[MinValueValidator(0)])
    progress = models.FloatField(default=0, validators=[MinValueValidator(0), MaxValueValidator(1)])
    kind = models.CharField(max_length=200)
    extra_fields = JSONField(default={}, blank=True)

    def calculate_source_id(self):
        return self.content_id


class UserSessionLog(BaseLogModel):
    """
    This model provides a record of a user session in Kolibri.
    """
    # Morango syncing settings
    morango_model_name = "usersessionlog"

    user = models.ForeignKey(FacilityUser)
    channels = models.TextField(blank=True)
    start_timestamp = DateTimeTzField(default=local_now)
    last_interaction_timestamp = DateTimeTzField(null=True, blank=True)
    pages = models.TextField(blank=True)

    @classmethod
    def update_log(cls, user):
        """
        Update the current UserSessionLog for a particular user.
        """
        if user and isinstance(user, FacilityUser):
            try:
                user_session_log = cls.objects.filter(user=user).latest('last_interaction_timestamp')
            except ObjectDoesNotExist:
                user_session_log = None

            if not user_session_log or timezone.now() - user_session_log.last_interaction_timestamp > timedelta(minutes=5):
                user_session_log = cls(user=user)
            user_session_log.last_interaction_timestamp = local_now()
            user_session_log.save()


class MasteryLog(BaseLogModel):
    """
    This model provides a summary of a user's engagement with an assessment within a mastery level
    """
    # Morango syncing settings
    morango_model_name = "masterylog"

    user = models.ForeignKey(FacilityUser)
    # Every MasteryLog is related to the single summary log for the user/content pair
    summarylog = models.ForeignKey(ContentSummaryLog, related_name="masterylogs")
    # The MasteryLog records the mastery criterion that has been specified for the user.
    # It is recorded here to prevent this changing in the middle of a user's engagement
    # with an assessment.
    mastery_criterion = JSONField(default={})
    start_timestamp = DateTimeTzField()
    end_timestamp = DateTimeTzField(blank=True, null=True)
    completion_timestamp = DateTimeTzField(blank=True, null=True)
    # The integer mastery level that this log is tracking.
    mastery_level = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)])
    # Has this mastery level been completed?
    complete = models.BooleanField(default=False)

    def infer_dataset(self, *args, **kwargs):
        return self.user.dataset

    def calculate_source_id(self):
        return "{summarylog_id}:{mastery_level}".format(summarylog_id=self.summarylog_id, mastery_level=self.mastery_level)


class BaseAttemptLog(BaseLogModel):
    """
    This is an abstract model that provides a summary of a user's engagement within a particular
    interaction with an item/question in an assessment
    """
    # Unique identifier within the relevant assessment for the particular question/item
    # that this attemptlog is a record of an interaction with.
    item = models.CharField(max_length=200)
    start_timestamp = DateTimeTzField()
    end_timestamp = DateTimeTzField()
    completion_timestamp = DateTimeTzField(blank=True, null=True)
    time_spent = models.FloatField(help_text="(in seconds)", default=0.0, validators=[MinValueValidator(0)])
    complete = models.BooleanField(default=False)
    # How correct was their answer? In simple cases, just 0 or 1.
    correct = models.FloatField(validators=[MinValueValidator(0), MaxValueValidator(1)])
    hinted = models.BooleanField(default=False)
    # JSON blob that would allow the learner's answer to be rerendered in the frontend interface
    answer = JSONField(default={}, null=True, blank=True)
    # A human readable answer that could be rendered directly in coach reports, can be blank.
    simple_answer = models.CharField(max_length=200, blank=True)
    # A JSON Array with a sequence of JSON objects that describe the history of interaction of the user
    # with this assessment item in this attempt.
    interaction_history = JSONField(default=[], blank=True)
    user = models.ForeignKey(FacilityUser, blank=True, null=True)

    class Meta:
        abstract = True


class AttemptLog(BaseAttemptLog):
    """
    This model provides a summary of a user's engagement within a particular interaction with an
    item/question in an assessment
    """

    morango_model_name = 'attemptlog'

    # Which mastery log was this attemptlog associated with?
    masterylog = models.ForeignKey(MasteryLog, related_name="attemptlogs", blank=True, null=True)
    sessionlog = models.ForeignKey(ContentSessionLog, related_name="attemptlogs")

    def infer_dataset(self, *args, **kwargs):
        return self.sessionlog.dataset


class ExamLog(BaseLogModel):
    """
    This model provides a summary of a user's interaction with a particular exam, and serves as
    an aggregation point for individual attempts on that exam.
    """

    morango_model_name = 'examlog'

    # Identifies the exam that this is for.
    exam = models.ForeignKey(Exam, related_name="examlogs", blank=False, null=False)
    # Identifies which user this log summarizes interactions for.
    user = models.ForeignKey(FacilityUser)
    # Is this exam open for engagement, or is it closed?
    # Used to end user engagement with an exam when it has been deactivated.
    closed = models.BooleanField(default=False)
    # when was this exam finished?
    completion_timestamp = DateTimeTzField(blank=True, null=True)

    def calculate_source_id(self):
        return "{exam_id}:{user_id}".format(exam_id=self.exam_id, user_id=self.user_id)

    def calculate_partition(self):
        return self.dataset_id


class ExamAttemptLog(BaseAttemptLog):
    """
    This model provides a summary of a user's engagement within a particular interaction with an
    item/question in an exam
    """

    morango_model_name = 'examattemptlog'

    examlog = models.ForeignKey(ExamLog, related_name="attemptlogs", blank=False, null=False)
    # We have no session logs associated with ExamLogs, so we need to record the channel and content
    # ids here
    content_id = UUIDField()
    channel_id = UUIDField()

    def infer_dataset(self, *args, **kwargs):
        return self.examlog.dataset

    def calculate_partition(self):
        return self.dataset_id
