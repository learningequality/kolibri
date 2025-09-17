"""
This is the model used to create notifications that are calculated based
on the information different logs provide.

If using sqlite, all the information is saved in a separate database to avoid
performance problems due to the locks on the main database.

None of these models will have Morango synchronization
"""
from django.db import models
from morango.models import UUIDField

from kolibri.core.fields import DateTimeTzField
from kolibri.core.fields import JSONField
from kolibri.core.utils.model_router import KolibriModelRouter
from kolibri.deployment.default.sqlite_db_names import NOTIFICATIONS
from kolibri.utils.data import ChoicesEnum
from kolibri.utils.time_utils import local_now


class NotificationObjectType(ChoicesEnum):
    Resource = "Resource"
    Quiz = "Quiz"
    Help = "Help"
    Lesson = "Lesson"


class NotificationEventType(ChoicesEnum):
    Started = "Started"
    Completed = "Completed"
    Help = "HelpNeeded"
    Answered = "Answered"


class HelpReason(ChoicesEnum):
    Multiple = "MultipleUnsuccessfulAttempts"


class LearnerProgressNotification(models.Model):
    id = (
        models.AutoField(
            auto_created=True, primary_key=True, serialize=True, verbose_name="ID"
        ),
    )
    notification_object = models.CharField(
        max_length=200, choices=NotificationObjectType.choices(), blank=True
    )
    notification_event = models.CharField(
        max_length=200, choices=NotificationEventType.choices(), blank=True
    )
    user_id = UUIDField()
    classroom_id = UUIDField()  # This is a Classroom id
    assignment_collections = JSONField(null=True, default=[])
    contentnode_id = UUIDField(null=True)
    lesson_id = UUIDField(null=True)
    quiz_id = UUIDField(null=True)
    quiz_num_correct = models.IntegerField(null=True)
    quiz_num_answered = models.IntegerField(null=True)
    reason = models.CharField(max_length=200, choices=HelpReason.choices(), blank=True)
    timestamp = DateTimeTzField(default=local_now)

    def __str__(self):
        return "{object} - {event}".format(
            object=self.notification_object, event=self.notification_event
        )

    class Meta:
        app_label = "notifications"
        indexes = [
            models.Index(
                fields=[
                    "-timestamp",
                ]
            ),
        ]


class NotificationsLog(models.Model):
    id = (
        models.AutoField(
            auto_created=True, primary_key=True, serialize=True, verbose_name="ID"
        ),
    )
    coach_id = UUIDField()
    timestamp = DateTimeTzField(default=local_now)

    def __str__(self):
        return self.coach_id

    class Meta:
        app_label = "notifications"


class NotificationsRouter(KolibriModelRouter):
    """
    Determine how to route database calls for the Notifications app.
    All other models will be routed to the default database.
    """

    MODEL_CLASSES = {LearnerProgressNotification, NotificationsLog}
    DB_NAME = NOTIFICATIONS
