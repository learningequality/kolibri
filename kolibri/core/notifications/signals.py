import uuid

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver
from le_utils.constants import content_kinds

from .models import HelpReason
from .models import LearnerProgressNotification
from .models import NotificationType
from kolibri.core.content.models import ContentNode
from kolibri.core.exams.models import ExamAssignment
from kolibri.core.lessons.models import Lesson
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.logger.models import ExamLog


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


def get_exam_group(memberships, exam_id):
    """
    Returns all classrooms or learner groups having this exam
    """
    learner_groups = [m.collection for m in memberships]
    filtered_exam_assignments = ExamAssignment.objects.filter(
        exam_id=exam_id,
        collection__in=learner_groups
    ).distinct()
    touched_groups = [assignment.collection_id for assignment in filtered_exam_assignments]
    return touched_groups


def save_notifications(notifications):
    with transaction.atomic():
        for notification in notifications:
            notification.save()


def create_notification(notification_type, user_id, group_id, lesson_id=None,
                        contentnode_id=None,
                        quiz_id=None, reason=None):
    notification = LearnerProgressNotification()
    notification.id = uuid.uuid4().hex
    notification.user_id = user_id
    notification.classroom_id = group_id
    notification.notification_type = notification_type
    if contentnode_id:
        notification.contentnode_id = contentnode_id
    if lesson_id:
        notification.lesson_id = lesson_id
    if quiz_id:
        notification.quiz_id = quiz_id
    if reason:
        notification.reason = reason
    return notification


@receiver(post_save, sender=ContentSummaryLog)
def parse_summary_log(sender, instance, **kwargs):
    if instance.progress < 1.0:
        return
    user_classrooms = instance.user.memberships.all()
    # If the user is not in any classroom nor group, nothing to notify
    if not user_classrooms:
        return
    content_node = ContentNode.objects.filter(channel_id=instance.channel_id,
                                              content_id=instance.content_id,
                                              available=True).order_by('lft').first()
    touched_groups = get_assignments(user_classrooms, content_node.id)
    notifications = []
    for group_id in touched_groups:
        lesson_id, lesson_resources = touched_groups[group_id]
        # Check if the notification has been previously saved:
        if LearnerProgressNotification.objects.filter(user_id=instance.user_id,
                                                      notification_type=NotificationType.Resource.name,
                                                      lesson_id=lesson_id,
                                                      contentnode_id=content_node.id).exists():
            continue
        # Let's create an ResourceIndividualCompletion
        notification = create_notification(NotificationType.Resource,
                                           instance.user_id,
                                           group_id,
                                           lesson_id=lesson_id,
                                           contentnode_id=content_node.id)
        notifications.append(notification)
        lesson_content_ids = [resource['content_id'] for resource in lesson_resources]

        # Let's check if an LessonResourceIndividualCompletion needs to be created
        user_completed = sender.objects.filter(user_id=instance.user_id, content_id__in=lesson_content_ids, progress=1.0).count()
        if user_completed == len(lesson_content_ids):
            if not LearnerProgressNotification.objects.filter(user_id=instance.user_id,
                                                              notification_type=NotificationType.Lesson.name,
                                                              lesson_id=lesson_id,
                                                              classroom_id=group_id).exists():
                lesson_notification = create_notification(NotificationType.Lesson, instance.user_id,
                                                          group_id, lesson_id=lesson_id)
                notifications.append(lesson_notification)

    save_notifications(notifications)


@receiver(post_save, sender=ExamLog)
def parse_exam_log(sender, instance, **kwargs):
    if not instance.closed:
        return
    user_classrooms = instance.user.memberships.all()
    # If the user is not in any classroom nor group, nothing to notify
    if not user_classrooms:
        return

    touched_groups = get_exam_group(user_classrooms, instance.exam_id)
    notifications = []
    for group in touched_groups:
        notification = create_notification(NotificationType.Quiz, instance.user_id, group, quiz_id=instance.exam_id)
        notifications.append(notification)

    save_notifications(notifications)


@receiver(post_save, sender=AttemptLog)
def parse_attempts_log(sender, instance, **kwargs):
    user_classrooms = instance.user.memberships.all()
    # If the user is not in any classroom nor group, nothing to notify
    if not user_classrooms:
        return

    content_id = instance.masterylog.summarylog.content_id
    channel_id = instance.masterylog.summarylog.channel_id
    content_node = ContentNode.objects.filter(channel_id=channel_id,
                                              content_id=content_id,
                                              available=True).order_by('lft').first()
    # This Event can only be triggered on Exercises in a Lesson:
    if content_node.kind != content_kinds.EXERCISE:
        return
    # This Event should be triggered only once
    # TODO: Decide if add a day interval filter, to trigger the event in different days
    if LearnerProgressNotification.objects.filter(contentnode_id=content_node.id,
                                                  user_id=instance.user_id,
                                                  notification_type=NotificationType.Help.name).exists():
        return

    # This Event should not be triggered when a Learner is interacting with an Exercise outside of a Lesson:
    touched_groups = get_assignments(user_classrooms, content_node.id)
    if not touched_groups:
        return
    # get all the atempts log on this exercise:
    needs_help = False
    failed_interactions = []
    attempts = AttemptLog.objects.filter(masterylog_id=instance.masterylog_id)
    for attempt in attempts:
        failed_interactions += [failed for failed in attempt.interaction_history if failed['correct'] == 0]
        # More than 3 errors in this mastery log
        if len(failed_interactions) > 3:
            needs_help = True
            break
    if needs_help:
        notifications = []
        for group in touched_groups:
            # Check if the notification for that exercise and group has already been created:
            if LearnerProgressNotification.objects.filter(user_id=instance.user_id,
                                                          notification_type=NotificationType.Help.name,
                                                          classroom_id=group,
                                                          contentnode_id=content_node.id).exists():
                continue
            lesson_id, _ = touched_groups[group]
            notification = create_notification(NotificationType.Help, instance.user_id, group,
                                               lesson_id=lesson_id,
                                               contentnode_id=content_node.id,
                                               reason=HelpReason.Multiple)
            notifications.append(notification)
        save_notifications(notifications)
