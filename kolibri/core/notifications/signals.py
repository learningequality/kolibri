import uuid

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import KolibriNotification
from .models import NotificationType
from kolibri.core.lessons.models import Lesson
from kolibri.core.logger.models import ContentSummaryLog
# from .models import HelpReason
# from kolibri.core.exams.models import Exam


def get_assignments(memberships, content_id):
    """
    Returns all Lessons assigned to the user having the content_id
    """
    learner_groups = [m.collection for m in memberships]

    # Return only active Lessons that are assigned to the requesting user's groups
    filtered_lessons = Lesson.objects.filter(
        lesson_assignments__collection__in=learner_groups,
        is_active=True,
        resources__regex=r"" + content_id + ""
    ).distinct()
    lesson_resources = {lesson.collection_id: (lesson.id, lesson.resources) for lesson in filtered_lessons}
    return lesson_resources


@receiver(post_save, sender=ContentSummaryLog)
def parse_summary_log(sender, instance, **kwargs):
    if instance.progress < 1.0:
        return

    user_classrooms = instance.user.memberships.all()
    # If the user is not in any classroom nor group, nothing to notify
    if not user_classrooms:
        return

    touched_groups = get_assignments(user_classrooms, instance.content_id)
    notifications = []
    for group_id in touched_groups:
        lesson_id, lesson_resources = touched_groups[group_id]
        # Check if the notification has been previously saved:
        if KolibriNotification.objects.filter(user_id=instance.user_id,
                                              notification_type=NotificationType.Resource,
                                              lesson_id=lesson_id,
                                              contentnode_id=instance.content_id).count() > 0:
            continue

        # Let's create an ResourceIndividualCompletion
        notification = KolibriNotification()
        notification.id = uuid.uuid4().hex
        notification.notification_type = NotificationType.Resource
        notification.user_id = instance.user_id
        notification.contentnode_id = instance.content_id
        notification.channel_id = instance.channel_id
        notification.lesson_id = lesson_id
        notification.classroom_id = group_id
        notifications.append(notification)
        lesson_content_ids = [resource['content_id'] for resource in lesson_resources]

        # Let's check if an LessonResourceIndividualCompletion needs to be created
        user_completed = sender.objects.filter(user_id=instance.user_id, content_id__in=lesson_content_ids, progress=1.0).count()
        if user_completed == len(lesson_content_ids):
            lesson_notification = KolibriNotification()
            lesson_notification.id = uuid.uuid4().hex
            lesson_notification.notification_type = NotificationType.Lesson
            lesson_notification.user_id = instance.user_id
            lesson_notification.lesson_id = lesson_id
            lesson_notification.classroom_id = group_id
            notifications.append(lesson_notification)

    with transaction.atomic():
        for notification in notifications:
            notification.save()
