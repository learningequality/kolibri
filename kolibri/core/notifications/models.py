"""
This is the model used to create notifications that are calculated based
on the information different logs provide.

If using sqlite, all the information is saved in a separate database to avoid
performance problems due to the locks on the main database.

None of these models will have Morango synchronization
"""
from django.db import models
from django.utils.encoding import python_2_unicode_compatible
from enum import Enum

from kolibri.core.content.models import UUIDField
from kolibri.core.fields import DateTimeTzField
from kolibri.utils.time import local_now


class NotificationsRouter(object):
    """
    Determine how to route database calls for the Notifications app.
    All other models will be routed to the default database.

    If using sqlite, this command must be executed to run migrations under this router:
        `kolibri manage migrate notifications --database=notifications_db`
    """

    def db_for_read(self, model, **hints):
        """Send all read operations on Notifications app models to `notifications_db`."""
        if model._meta.app_label == 'notifications':
            return 'notifications_db'
        return None

    def db_for_write(self, model, **hints):
        """Send all write operations on Notifications app models to `notifications_db`."""
        if model._meta.app_label == 'notifications':
            return 'notifications_db'
        return None

    def allow_relation(self, obj1, obj2, **hints):
        """Determine if relationship is allowed between two objects."""

        # Allow any relation between two models that are both in the Notifications app.
        if obj1._meta.app_label == 'notifications' and obj2._meta.app_label == 'notifications':
            return True
        # No opinion if neither object is in the Notifications app (defer to default or other routers).
        elif 'notifications' not in [obj1._meta.app_label, obj2._meta.app_label]:
            return None

        # Block relationship if one object is in the Notifications app and the other isn't.
        return False

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """Ensure that the Notifications app's models get created on the right database."""
        if app_label == 'notifications':
            # The Notifications app should be migrated only on the notifications_db database.
            return db == 'notifications_db'
        elif db == 'notifications_db':
            # Ensure that all other apps don't get migrated on the notifications_db database.
            return False

        # No opinion for all other scenarios
        return None


class NotificationType(Enum):
    Resource = "ResourceIndividualCompletion"
    Quiz = "QuizIndividualCompletion"
    Help = "LessonResourceIndividualNeedsHelpEvent"
    Lesson = "LessonResourceIndividualCompletion"


class HelpReason(Enum):
    Multiple = "MultipleUnsuccessfulAttempts"


@python_2_unicode_compatible
class KolibriNotification(models.Model):
    id = UUIDField(primary_key=True)
    notification_type = models.CharField(max_length=200, choices=[(t, t.value) for t in NotificationType], blank=True)
    user_id = UUIDField()
    classroom_id = UUIDField()
    contentnode_id = UUIDField(null=True)
    channel_id = UUIDField(null=True)
    contentnode_id = UUIDField(null=True)
    lesson_id = UUIDField(null=True)
    quiz_id = UUIDField(null=True)
    reason = models.CharField(max_length=200, choices=[(r, r.value) for r in HelpReason], blank=True)
    timestamp = DateTimeTzField(default=local_now)

    def __str__(self):
        return self.type

    class Meta:
        app_label = 'notifications'
