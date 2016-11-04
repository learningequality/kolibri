"""
This app is intended to provide the core functionality for tracking user
engagement with content and Kolibri in general. As such, it is intended
to store details of user interactions with content, a summary of those
interactions, interactions with the software in general, as well as user
feedback on the content and the software.
"""

from __future__ import unicode_literals

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from kolibri.auth.constants import role_kinds
from kolibri.auth.models import AbstractFacilityDataModel, Facility, FacilityUser
from kolibri.auth.permissions.base import RoleBasedPermissions
from kolibri.auth.permissions.general import IsOwn
from kolibri.content.content_db_router import default_database_is_attached, get_active_content_database
from kolibri.content.models import UUIDField

from .permissions import AnyoneCanWriteAnonymousLogs


class BaseLogQuerySet(models.QuerySet):

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

        if default_database_is_attached():
            # perform the query using an efficient cross-database join, if possible
            return self.using(get_active_content_database()).filter(**{content_id_lookup + "__in": content_ids})
        else:
            # if the databases can't be joined, convert the content_ids into a list and pass in
            return self.filter(**{content_id_lookup + "__in": list(content_ids)})


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

    def infer_dataset(self):
        if self.user:
            return self.user.dataset
        else:
            facility = Facility.get_default_facility()
            assert facility, "Before you can save logs, you must have a facility"
            return facility.dataset

    objects = BaseLogQuerySet.as_manager()


class ContentSessionLog(BaseLogModel):
    """
    This model provides a record of interactions with a content item within a single visit to that content page.
    """
    user = models.ForeignKey(FacilityUser, blank=True, null=True)
    content_id = UUIDField(db_index=True)
    channel_id = UUIDField()
    start_timestamp = models.DateTimeField()
    end_timestamp = models.DateTimeField(blank=True, null=True)
    time_spent = models.FloatField(help_text="(in seconds)", default=0.0, validators=[MinValueValidator(0)])
    progress = models.FloatField(default=0, validators=[MinValueValidator(0)])
    kind = models.CharField(max_length=200)
    extra_fields = models.TextField(default="{}")


class ContentSummaryLog(BaseLogModel):
    """
    This model provides a summary of all interactions a user has had with a content item.
    """
    user = models.ForeignKey(FacilityUser)
    content_id = UUIDField(db_index=True)
    channel_id = UUIDField()
    start_timestamp = models.DateTimeField()
    end_timestamp = models.DateTimeField(blank=True, null=True)
    completion_timestamp = models.DateTimeField(blank=True, null=True)
    time_spent = models.FloatField(help_text="(in seconds)", default=0.0, validators=[MinValueValidator(0)])
    progress = models.FloatField(default=0, validators=[MinValueValidator(0), MaxValueValidator(1)])
    kind = models.CharField(max_length=200)
    extra_fields = models.TextField(default="{}")


class ContentRatingLog(BaseLogModel):
    """
    This model provides a record of user feedback on a content item.
    """
    user = models.ForeignKey(FacilityUser, blank=True, null=True)
    content_id = UUIDField(db_index=True)
    channel_id = UUIDField()
    quality = models.IntegerField(blank=True, null=True, validators=[MinValueValidator(1), MaxValueValidator(5)])
    ease = models.IntegerField(blank=True, null=True, validators=[MinValueValidator(1), MaxValueValidator(5)])
    learning = models.IntegerField(blank=True, null=True, validators=[MinValueValidator(1), MaxValueValidator(5)])
    feedback = models.TextField(blank=True)


class UserSessionLog(BaseLogModel):
    """
    This model provides a record of a user session in Kolibri.
    """
    user = models.ForeignKey(FacilityUser)
    channels = models.TextField(blank=True)
    start_timestamp = models.DateTimeField(auto_now_add=True)
    completion_timestamp = models.DateTimeField(blank=True, null=True)
    pages = models.TextField(blank=True)

class MasteryLog(BaseLogModel):
    """
    This model provides a summary of a user's engagement with an assessment within a mastery level
    """
    permissions = log_permissions("summarylog__user")

    # Every MasteryLog is related to the single summary log for the user/content pair
    summarylog = models.ForeignKey(ContentSummaryLog, related_name="masterylogs")
    # The MasteryLog records the mastery criterion that has been specified for the user.
    # It is recorded here to prevent this changing in the middle of a user's engagement
    # with an assessment.
    mastery_criterion = models.TextField()
    start_timestamp = models.DateTimeField()
    end_timestamp = models.DateTimeField(blank=True, null=True)
    completion_timestamp = models.DateTimeField(blank=True, null=True)
    # The integer mastery level that this log is tracking.
    mastery_level = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)])
    # Has this mastery level been completed?
    complete = models.BooleanField(default=False)

    def infer_dataset(self):
        return self.summarylog.dataset

class AttemptLog(AbstractFacilityDataModel):
    """
    This model provides a summary of a user's engagement within a particular interaction with an
    item in an assessment
    """
    permissions = log_permissions("sessionlog__user")

    # Unique identifier within the relevant assessment for the particular question/item
    # that this attemptlog is a record of an interaction with.
    item = models.CharField(max_length=200)
    start_timestamp = models.DateTimeField()
    end_timestamp = models.DateTimeField()
    completion_timestamp = models.DateTimeField(blank=True, null=True)
    # Which mastery log was this attemptlog associated with?
    masterylog = models.ForeignKey(MasteryLog, related_name="attemptlogs", blank=True, null=True)
    sessionlog = models.ForeignKey(ContentSessionLog, related_name="attemptlogs")
    time_spent = models.FloatField(help_text="(in seconds)", default=0.0, validators=[MinValueValidator(0)])
    complete = models.BooleanField(default=False)
    # How correct was their answer? In simple cases, just 0 or 1.
    correct = models.FloatField(validators=[MinValueValidator(0), MaxValueValidator(1)])
    hinted = models.BooleanField(default=False)
    # JSON blob that would allow the learner's answer to be rerendered in the frontend interface
    answer = models.TextField()
    # A human readable answer that could be rendered directly in coach reports, can be blank.
    simple_answer = models.CharField(max_length=200, blank=True)
    # A JSON Array with a sequence of JSON objects that describe the history of interaction of the user
    # with this assessment item in this attempt.
    interaction_history = models.TextField()

    def infer_dataset(self):
        return self.sessionlog.dataset
