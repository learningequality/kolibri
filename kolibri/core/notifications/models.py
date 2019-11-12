"""
This is the model used to create notifications that are calculated based
on the information different logs provide.

If using sqlite, all the information is saved in a separate database to avoid
performance problems due to the locks on the main database.

None of these models will have Morango synchronization
"""
from __future__ import unicode_literals

from django.conf import settings
from django.db import models
from django.utils.encoding import python_2_unicode_compatible
from morango.models import UUIDField

from kolibri.core.fields import DateTimeTzField
from kolibri.utils.time_utils import local_now

# Remove NotificationsRouter if sqlite is not being used:
if settings.DATABASES["default"]["ENGINE"] != "django.db.backends.sqlite3":
    ROUTER_ID = "kolibri.core.notifications.models.NotificationsRouter"
    if ROUTER_ID in settings.DATABASE_ROUTERS:
        settings.DATABASE_ROUTERS = tuple(
            filter(lambda x: x != ROUTER_ID, settings.DATABASE_ROUTERS)
        )


class NotificationsRouter(object):
    """
    Determine how to route database calls for the Notifications app.
    All other models will be routed to the default database.

    If using sqlite, this command must be executed to run migrations under this router:
        `kolibri manage migrate notifications --database=notifications_db`
    """

    def db_for_read(self, model, **hints):
        """Send all read operations on Notifications app models to `notifications_db`."""
        if model._meta.app_label == "notifications":
            return "notifications_db"
        return None

    def db_for_write(self, model, **hints):
        """Send all write operations on Notifications app models to `notifications_db`."""
        if model._meta.app_label == "notifications":
            return "notifications_db"
        return None

    def allow_relation(self, obj1, obj2, **hints):
        """Determine if relationship is allowed between two objects."""

        # Allow any relation between two models that are both in the Notifications app.
        if (
            obj1._meta.app_label == "notifications"
            and obj2._meta.app_label == "notifications"
        ):
            return True
        # No opinion if neither object is in the Notifications app (defer to default or other routers).
        elif "notifications" not in [obj1._meta.app_label, obj2._meta.app_label]:
            return None

        # Block relationship if one object is in the Notifications app and the other isn't.
        return False

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """Ensure that the Notifications app's models get created on the right database."""
        if app_label == "notifications":
            # The Notifications app should be migrated only on the notifications_db database.
            return db == "notifications_db"
        elif db == "notifications_db":
            # Ensure that all other apps don't get migrated on the notifications_db database.
            return False

        # No opinion for all other scenarios
        return None


class myEnum(object):
    @classmethod
    def choices(cls):
        choices_list = [
            ("{}".format(m), getattr(cls, m)) for m in cls.__dict__ if m[0] != "_"
        ]
        return tuple(sorted(choices_list))


class NotificationObjectType(myEnum):
    Resource = "Resource"
    Quiz = "Quiz"
    Help = "Help"
    Lesson = "Lesson"


class NotificationEventType(myEnum):
    Started = "Started"
    Completed = "Completed"
    Help = "HelpNeeded"
    Answered = "Answered"


class HelpReason(myEnum):
    Multiple = "MultipleUnsuccessfulAttempts"


@python_2_unicode_compatible
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
    classroom_id = UUIDField()  # This can be either a Classroom or a LearnerGroup id
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


@python_2_unicode_compatible
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
