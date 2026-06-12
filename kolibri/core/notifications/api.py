from django.db import transaction
from django.db.models import Case
from django.db.models import Count
from django.db.models import F
from django.db.models import Q
from django.db.models import Sum
from django.db.models import When
from le_utils.constants import content_kinds

from kolibri.core.content.models import ContentNode
from kolibri.core.courses.models import CourseSession
from kolibri.core.courses.models import CourseSessionAssignment
from kolibri.core.exams.models import Exam
from kolibri.core.exams.models import ExamAssignment
from kolibri.core.lessons.models import Lesson
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.logger.models import ExamAttemptLog
from kolibri.core.logger.models import ExamLog
from kolibri.core.logger.models import MasteryLog
from kolibri.core.logger.utils.quiz import annotate_response_summary
from kolibri.core.query import annotate_array_aggregate

from .models import HelpReason
from .models import LearnerProgressNotification
from .models import NotificationEventType
from .models import NotificationObjectType
from .utils import memoize

NEEDS_HELP_NOTIFICATION_THRESHOLD = 4


@memoize
def get_assignments(user, summarylog, attempt=False):
    """
    Returns all Lessons assigned to the user having the content_id
    """
    memberships = user.memberships.all()
    # If the user is not in any classroom nor group, nothing to notify
    if not memberships.exists():
        return []

    content_id = summarylog.content_id
    channel_id = summarylog.channel_id
    learner_collections = memberships.values_list("collection_id", flat=True)

    # Return only active Lessons that are assigned to the requesting user's groups
    filtered_lessons = (
        annotate_array_aggregate(
            Lesson.objects.filter(
                lesson_assignments__collection_id__in=learner_collections,
                is_active=True,
                resources__regex=r"" + content_id + "",
            ),
            assignment_collections="lesson_assignments__collection_id",
        )
        .distinct()
        .values(
            "id", "resources", "assignment_collections", classroom_id=F("collection_id")
        )
    )
    # get the contentnode_id for each lesson:
    lesson_contentnode_map = {
        lesson["id"]: r["contentnode_id"]
        for lesson in filtered_lessons
        for r in lesson["resources"]
        if (r["content_id"] == content_id and r["channel_id"] == channel_id)
    }
    if attempt:
        # This part is for the NeedsHelp event. These Events can only be triggered on Exercises:
        to_delete = []
        content_nodes = ContentNode.objects.filter(
            pk__in=lesson_contentnode_map.values()
        ).in_bulk()
        for lesson_id, contentnode_id in lesson_contentnode_map.items():
            content_node = content_nodes.get(contentnode_id, None)
            if content_node is not None and content_node.kind != content_kinds.EXERCISE:
                to_delete.append(lesson_id)
        for lesson_id in to_delete:
            del lesson_contentnode_map[lesson_id]
    # Returns all the affected lessons with the touched contentnode_id, Resource must be inside a lesson
    lesson_resources = [
        (lesson, lesson_contentnode_map[lesson["id"]])
        for lesson in filtered_lessons
        if lesson["id"] in lesson_contentnode_map
    ]

    learner_collections_set = set(learner_collections)
    # Try to find out if the lesson is being executed assigned to a Classroom or to a LearnerGroup:
    for lesson, contentnode_id in lesson_resources:
        lesson["assignment_collections"] = list(
            set(lesson["assignment_collections"]).intersection(learner_collections_set)
        )

    return lesson_resources


def get_course_session_context(user, course_session_id):
    """
    Returns classroom_id and assignment_collections for a course session,
    or None if the course session does not exist.
    """
    course_session = (
        CourseSession.objects.filter(id=course_session_id)
        .values(classroom_id=F("collection_id"))
        .first()
    )
    if not course_session:
        return None
    assignment_collections = list(
        CourseSessionAssignment.objects.filter(
            course_session_id=course_session_id,
            collection_id__in=user.memberships.all().values_list(
                "collection_id", flat=True
            ),
        )
        .distinct()
        .values_list("collection_id", flat=True)
    )
    return {
        "classroom_id": course_session["classroom_id"],
        "assignment_collections": assignment_collections,
    }


def _get_lesson_contentnode_id(node_id):
    """
    Returns the parent ContentNode ID for a given node — i.e., the lesson
    ContentNode that contains the resource being interacted with.
    """
    return (
        ContentNode.objects.filter(id=node_id)
        .values_list("parent_id", flat=True)
        .first()
    )


def get_course_lesson_dict(user, node_id, course_session_id):
    """
    Build a lesson-like dict for course content so it can be passed to the
    shared check_and_created_* helpers.  The "lesson" is the parent ContentNode
    of node_id; its children are the resources.
    """
    lesson_contentnode_id = _get_lesson_contentnode_id(node_id)
    if not lesson_contentnode_id:
        return None
    session_context = get_course_session_context(user, course_session_id)
    if not session_context:
        return None
    resources = list(
        ContentNode.objects.filter(parent_id=lesson_contentnode_id).values("content_id")
    )
    return {
        "id": lesson_contentnode_id,
        "classroom_id": session_context["classroom_id"],
        "assignment_collections": session_context["assignment_collections"],
        "course_session_id": course_session_id,
        "resources": resources,
    }


def save_notifications(notifications):
    with transaction.atomic():
        for notification in notifications:
            if notification:
                notification.save()


def create_notification(
    notification_object,
    notification_event,
    user_id,
    classroom_id,
    assignment_collections=None,
    lesson_id=None,
    contentnode_id=None,
    quiz_id=None,
    quiz_num_correct=None,
    quiz_num_answered=None,
    reason=None,
    course_session_id=None,
    timestamp=None,
):
    notification = LearnerProgressNotification()
    notification.user_id = user_id
    notification.classroom_id = classroom_id
    notification.notification_object = notification_object
    notification.notification_event = notification_event
    if contentnode_id:
        notification.contentnode_id = contentnode_id
    if lesson_id:
        notification.lesson_id = lesson_id
    if quiz_id:
        notification.quiz_id = quiz_id
    if quiz_num_correct is not None:
        notification.quiz_num_correct = quiz_num_correct
    if quiz_num_answered is not None:
        notification.quiz_num_answered = quiz_num_answered
    if reason:
        notification.reason = reason
    if course_session_id:
        notification.course_session_id = course_session_id
    if timestamp:
        notification.timestamp = timestamp
    if assignment_collections and type(assignment_collections) is list:
        notification.assignment_collections = assignment_collections
    return notification


def check_and_created_completed_resource(lesson, user_id, contentnode_id, timestamp):
    notification = None
    # Check if the notification has been previously saved:
    if not LearnerProgressNotification.objects.filter(
        user_id=user_id,
        notification_object=NotificationObjectType.Resource,
        notification_event=NotificationEventType.Completed,
        lesson_id=lesson["id"],
        contentnode_id=contentnode_id,
        course_session_id=lesson.get("course_session_id"),
    ).exists():
        # Let's create an Resource Completion notification
        notification = create_notification(
            NotificationObjectType.Resource,
            NotificationEventType.Completed,
            user_id,
            lesson["classroom_id"],
            assignment_collections=lesson["assignment_collections"],
            lesson_id=lesson["id"],
            contentnode_id=contentnode_id,
            timestamp=timestamp,
            course_session_id=lesson.get("course_session_id"),
        )
    return notification


def check_and_created_completed_lesson(lesson, user_id, timestamp):
    notification = None

    # Check if the notification has already been created:
    lesson_completed_notification = LearnerProgressNotification.objects.filter(
        user_id=user_id,
        notification_object=NotificationObjectType.Lesson,
        notification_event=NotificationEventType.Completed,
        lesson_id=lesson["id"],
        classroom_id=lesson["classroom_id"],
        course_session_id=lesson.get("course_session_id"),
    ).first()

    # if it exists, keep the most recent timestamp, as a lesson is completed
    # when the last resource is completed
    if (
        lesson_completed_notification
        and lesson_completed_notification.timestamp < timestamp
    ):
        lesson_completed_notification.timestamp = timestamp
        notification = lesson_completed_notification
    elif not lesson_completed_notification:
        notification = create_notification(
            NotificationObjectType.Lesson,
            NotificationEventType.Completed,
            user_id,
            lesson["classroom_id"],
            assignment_collections=lesson["assignment_collections"],
            lesson_id=lesson["id"],
            timestamp=timestamp,
            course_session_id=lesson.get("course_session_id"),
        )

    return notification


def check_and_created_answered_lesson(lesson, user_id, contentnode_id, timestamp):
    notification = None
    # Check if the notification has been previously saved:
    if not LearnerProgressNotification.objects.filter(
        user_id=user_id,
        notification_object=NotificationObjectType.Resource,
        notification_event=NotificationEventType.Answered,
        lesson_id=lesson["id"],
        classroom_id=lesson["classroom_id"],
        timestamp=timestamp,
        course_session_id=lesson.get("course_session_id"),
    ).exists():
        # Let's create an Lesson Answered notification
        notification = create_notification(
            NotificationObjectType.Resource,
            NotificationEventType.Answered,
            user_id,
            lesson["classroom_id"],
            assignment_collections=lesson["assignment_collections"],
            lesson_id=lesson["id"],
            contentnode_id=contentnode_id,
            timestamp=timestamp,
            course_session_id=lesson.get("course_session_id"),
        )
    return notification


def check_and_created_started(lesson, user_id, contentnode_id, timestamp):
    notifications = []

    resource_started_notification = LearnerProgressNotification.objects.filter(
        user_id=user_id,
        notification_object=NotificationObjectType.Resource,
        notification_event=NotificationEventType.Started,
        lesson_id=lesson["id"],
        contentnode_id=contentnode_id,
        course_session_id=lesson.get("course_session_id"),
    ).first()
    # if it exists, keep the oldest timestamp, it means that there have been
    # multiple attempts, so the first attempt is the one that counts
    if (
        resource_started_notification
        and resource_started_notification.timestamp > timestamp
    ):
        resource_started_notification.timestamp = timestamp
        notifications.append(resource_started_notification)
    elif resource_started_notification:
        # Notification already created
        return []
    else:
        # Let's create an Resource Started notification
        notifications.append(
            create_notification(
                NotificationObjectType.Resource,
                NotificationEventType.Started,
                user_id,
                lesson["classroom_id"],
                assignment_collections=lesson["assignment_collections"],
                lesson_id=lesson["id"],
                contentnode_id=contentnode_id,
                timestamp=timestamp,
                course_session_id=lesson.get("course_session_id"),
            )
        )

    # Check if the Lesson started has already been created:
    lesson_started_notification = LearnerProgressNotification.objects.filter(
        user_id=user_id,
        notification_object=NotificationObjectType.Lesson,
        notification_event=NotificationEventType.Started,
        lesson_id=lesson["id"],
        classroom_id=lesson["classroom_id"],
        course_session_id=lesson.get("course_session_id"),
    ).first()

    # if it exists, keep the oldest timestamp, as a lesson is started
    # when the first resource is started
    if (
        lesson_started_notification
        and lesson_started_notification.timestamp > timestamp
    ):
        lesson_started_notification.timestamp = timestamp
        notifications.append(lesson_started_notification)
    elif not lesson_started_notification:
        notifications.append(
            create_notification(
                NotificationObjectType.Lesson,
                NotificationEventType.Started,
                user_id,
                lesson["classroom_id"],
                assignment_collections=lesson["assignment_collections"],
                lesson_id=lesson["id"],
                timestamp=timestamp,
                course_session_id=lesson.get("course_session_id"),
            )
        )

    return notifications


def create_summarylog(summarylog):
    """
    Method called by the ContentSummaryLogSerializer when the
    summarylog is created.
    It creates the Resource and, if needed, the Lesson Started event
    """
    # dont create notifications upon creating a summary log for an exercise
    # notifications should only be triggered upon first attempting a question in the exercise
    if summarylog.kind != content_kinds.EXERCISE:
        lessons = get_assignments(summarylog.user, summarylog)
        notifications = []
        for lesson, contentnode_id in lessons:
            notifications_started = check_and_created_started(
                lesson, summarylog.user_id, contentnode_id, summarylog.start_timestamp
            )
            notifications += notifications_started

        save_notifications(notifications)


@memoize
def _get_coach_lesson_dict(lesson_id):
    return (
        annotate_array_aggregate(
            Lesson.objects.filter(id=lesson_id),
            assignment_collections="lesson_assignments__collection_id",
        )
        .values(
            "id", "resources", "assignment_collections", classroom_id=F("collection_id")
        )
        .first()
    )


def _get_lesson_dict(lesson_id=None, course_session_id=None, user=None, node_id=None):
    if course_session_id:
        return get_course_lesson_dict(user, node_id, course_session_id)
    return _get_coach_lesson_dict(lesson_id)


def start_lesson_resource(
    summarylog, contentnode_id, lesson_id=None, course_session_id=None
):
    """
    Called to create resource started notifications (and lesson started notifications)
    when a resource is started within the context of a lesson.
    Either lesson_id or course_session_id must be provided.
    """
    lesson = _get_lesson_dict(
        lesson_id,
        course_session_id=course_session_id,
        user=summarylog.user,
        node_id=contentnode_id,
    )
    if lesson:
        notifications_started = check_and_created_started(
            lesson, summarylog.user_id, contentnode_id, summarylog.start_timestamp
        )
        save_notifications(notifications_started)


def _get_resource_completion_timestamp(summarylog):
    """
    If the resource has a mastery level, returns the completion time of
    the first attempt. Otherwise, returns the completion time of the summarylog.
    """
    mastery_first_completed = (
        MasteryLog.objects.filter(summarylog_id=summarylog.id, complete=True)
        .order_by("completion_timestamp")
        .first()
    )

    if (
        mastery_first_completed is None
        or mastery_first_completed.completion_timestamp is None
    ):
        return summarylog.completion_timestamp

    return mastery_first_completed.completion_timestamp


def _is_summary_log_incompleted(summarylog):
    # We also check the completion_timestamp as the resource could have been completed
    # but the user could have tried it again so the progress is 0.
    return summarylog.progress < 1.0 and not summarylog.completion_timestamp


def _get_lesson_resource_completed_notifications(
    summarylog, contentnode_id, lesson, completion_timestamp
):
    notifications = []

    resource_completed_notification = check_and_created_completed_resource(
        lesson, summarylog.user_id, contentnode_id, completion_timestamp
    )
    if resource_completed_notification:
        notifications.append(resource_completed_notification)
    else:
        return notifications

    # Let's check if all resouces in the lesson are completed
    lesson_content_ids = [resource["content_id"] for resource in lesson["resources"]]

    # We also check the completion_timestamp as the resource could have been completed
    # but the user could have tried it again so the progress is 0.
    resource_completed_Q = Q(progress__gte=1.0) | Q(completion_timestamp__isnull=False)
    lesson_resouces_completed = ContentSummaryLog.objects.filter(
        resource_completed_Q,
        user_id=summarylog.user_id,
        content_id__in=lesson_content_ids,
    ).count()

    if lesson_resouces_completed == len(lesson_content_ids):
        lesson_completed_notification = check_and_created_completed_lesson(
            lesson, summarylog.user_id, completion_timestamp
        )
        if lesson_completed_notification:
            notifications.append(lesson_completed_notification)

    return notifications


def finish_lesson_resource(
    summarylog, contentnode_id, lesson_id=None, course_session_id=None
):
    """
    Called to create resource completed notifications (and lesson completed notifications)
    when a resource is finished within the context of a lesson.
    Either lesson_id or course_session_id must be provided.
    """
    if _is_summary_log_incompleted(summarylog):
        return

    lesson = _get_lesson_dict(
        lesson_id,
        course_session_id=course_session_id,
        user=summarylog.user,
        node_id=contentnode_id,
    )
    if lesson:
        completion_timestamp = _get_resource_completion_timestamp(summarylog)
        notifications = _get_lesson_resource_completed_notifications(
            summarylog, contentnode_id, lesson, completion_timestamp
        )
        save_notifications(notifications)


def _get_user_needs_help(attemptlog):
    attempts = AttemptLog.objects.filter(masterylog_id=attemptlog.masterylog_id)
    failed_interactions = [
        interaction
        for attempt in attempts
        for interaction in attempt.interaction_history
        if interaction.get("correct", 0) == 0
    ]

    return len(failed_interactions) >= NEEDS_HELP_NOTIFICATION_THRESHOLD


def _get_help_needed_notification(attemptlog, contentnode_id, lesson):
    help_needed_notification = LearnerProgressNotification.objects.filter(
        user_id=attemptlog.user_id,
        notification_object=NotificationObjectType.Resource,
        notification_event=NotificationEventType.Help,
        lesson_id=lesson["id"],
        classroom_id=lesson["classroom_id"],
        contentnode_id=contentnode_id,
        course_session_id=lesson.get("course_session_id"),
    ).first()

    # This Event should be triggered only once or updated if the user keeps failing
    # TODO: Decide if add a day interval filter, to trigger the event in different days
    if not help_needed_notification:
        return create_notification(
            NotificationObjectType.Resource,
            NotificationEventType.Help,
            attemptlog.user_id,
            lesson["classroom_id"],
            assignment_collections=lesson["assignment_collections"],
            lesson_id=lesson["id"],
            contentnode_id=contentnode_id,
            reason=HelpReason.Multiple,
            timestamp=attemptlog.end_timestamp,
            course_session_id=lesson.get("course_session_id"),
        )

    # If the current attempt is newer and the student keeps failing, update the timestamp
    is_failed_attempt = (
        attemptlog.interaction_history
        and sum(
            1 if interaction.get("correct", 0) == 0 else 0
            for interaction in attemptlog.interaction_history
        )
        > 0
    )
    if (
        is_failed_attempt
        and help_needed_notification.timestamp < attemptlog.end_timestamp
    ):
        help_needed_notification.timestamp = attemptlog.end_timestamp
        return help_needed_notification


def parse_summarylog(summarylog):
    """
    Method called by the ContentSummaryLogSerializer everytime the
    summarylog is updated.
    It creates the Resource Completed notification.
    It also checks if the Lesson is completed to create the
    Lesson Completed notification.
    """

    if _is_summary_log_incompleted(summarylog):
        return

    lessons = get_assignments(summarylog.user, summarylog)
    completion_timestamp = _get_resource_completion_timestamp(summarylog)
    if not completion_timestamp:
        return

    notifications = []
    for lesson, contentnode_id in lessons:
        notifications += _get_lesson_resource_completed_notifications(
            summarylog, contentnode_id, lesson, completion_timestamp
        )

    save_notifications(notifications)


@memoize
def exist_exam_notification(user_id, exam_id, course_session_id=None):
    qs = LearnerProgressNotification.objects.filter(
        user_id=user_id,
        quiz_id=exam_id,
        notification_event=NotificationEventType.Started,
    )
    if course_session_id is not None:
        qs = qs.filter(course_session_id=course_session_id)
    return qs.exists()


@memoize
def exist_examattempt_notification(user_id, exam_id, course_session_id=None):
    qs = LearnerProgressNotification.objects.filter(
        user_id=user_id,
        quiz_id=exam_id,
        notification_event=NotificationEventType.Answered,
    )
    if course_session_id is not None:
        qs = qs.filter(course_session_id=course_session_id)
    return qs.exists()


def num_correct(examlog):
    return (
        examlog.attemptlogs.values_list("item", "content_id")
        .order_by("completion_timestamp")
        .distinct()
        .aggregate(Sum("correct"))
        .get("correct__sum")
    )


def num_answered(examlog):
    return (
        examlog.attemptlogs.values_list("item", "content_id")
        .order_by("completion_timestamp")
        .distinct()
        .aggregate(complete__sum=Count(Case(When(complete=True, then=1), default=0)))
        .get("complete__sum")
    )


def created_quiz_notification(examlog, event_type, timestamp):
    assigned_collections = list(
        ExamAssignment.objects.filter(
            exam_id=examlog.exam_id,
            collection_id__in=examlog.user.memberships.all().values_list(
                "collection_id", flat=True
            ),
        )
        .distinct()
        .values_list("collection_id", flat=True)
    )

    notification = create_notification(
        NotificationObjectType.Quiz,
        event_type,
        examlog.user_id,
        examlog.exam.collection_id,
        assignment_collections=assigned_collections,
        quiz_id=examlog.exam_id,
        quiz_num_correct=num_correct(examlog),
        quiz_num_answered=num_answered(examlog),
        timestamp=timestamp,
    )

    save_notifications([notification])


def _get_quiz_context(user, quiz_id, course_session_id=None):
    """
    Returns (collection_id, assigned_collections, course_session_id) for a quiz.
    When course_session_id is provided, uses course session assignments;
    otherwise uses exam assignments.
    """
    if course_session_id:
        session_context = get_course_session_context(user, course_session_id)
        if not session_context:
            return None
        return (
            session_context["classroom_id"],
            session_context["assignment_collections"],
            course_session_id,
        )
    assigned_collections = list(
        ExamAssignment.objects.filter(
            exam_id=quiz_id,
            collection_id__in=user.memberships.all().values_list(
                "collection_id", flat=True
            ),
        )
        .distinct()
        .values_list("collection_id", flat=True)
    )
    collection_id = (
        Exam.objects.filter(id=quiz_id).values_list("collection_id", flat=True).first()
    )
    return (collection_id, assigned_collections, None)


def quiz_started_notification(masterylog, quiz_id, course_session_id=None):
    if exist_exam_notification(masterylog.user_id, quiz_id, course_session_id):
        return  # the event has already been triggered

    quiz_context = _get_quiz_context(masterylog.user, quiz_id, course_session_id)
    if not quiz_context:
        return
    collection_id, assigned_collections, session_id = quiz_context

    notification = create_notification(
        NotificationObjectType.Quiz,
        NotificationEventType.Started,
        masterylog.user_id,
        collection_id,
        assignment_collections=assigned_collections,
        quiz_id=quiz_id,
        quiz_num_correct=0,
        quiz_num_answered=0,
        course_session_id=session_id,
        timestamp=masterylog.start_timestamp,
    )

    save_notifications([notification])

    exist_exam_notification.delete_key(masterylog.user_id, quiz_id, course_session_id)


@memoize
def exist_exam_completed_notification(user_id, exam_id, course_session_id=None):
    qs = LearnerProgressNotification.objects.filter(
        user_id=user_id,
        quiz_id=exam_id,
        notification_event=NotificationEventType.Completed,
    )
    if course_session_id is not None:
        qs = qs.filter(course_session_id=course_session_id)
    return qs.exists()


def quiz_completed_notification(masterylog, quiz_id, course_session_id=None):
    if not masterylog.complete:
        return

    if exist_exam_completed_notification(
        masterylog.user_id, quiz_id, course_session_id
    ):
        return

    quiz_context = _get_quiz_context(masterylog.user, quiz_id, course_session_id)
    if not quiz_context:
        return
    collection_id, assigned_collections, session_id = quiz_context

    response_data = (
        annotate_response_summary(MasteryLog.objects.filter(id=masterylog.id))
        .values("num_correct", "num_answered")
        .first()
        or {}
    )

    notification = create_notification(
        NotificationObjectType.Quiz,
        NotificationEventType.Completed,
        masterylog.user_id,
        collection_id,
        assignment_collections=assigned_collections,
        quiz_id=quiz_id,
        quiz_num_correct=response_data.get("num_correct", 0),
        quiz_num_answered=response_data.get("num_answered", 0),
        course_session_id=session_id,
        timestamp=masterylog.completion_timestamp,
    )

    save_notifications([notification])

    exist_exam_completed_notification.delete_key(
        masterylog.user_id, quiz_id, course_session_id
    )


def quiz_answered_notification(attemptlog, quiz_id, course_session_id=None):
    # Checks to add an 'Answered' event
    if exist_examattempt_notification(attemptlog.user_id, quiz_id, course_session_id):
        return  # the event has already been triggered

    quiz_context = _get_quiz_context(attemptlog.user, quiz_id, course_session_id)
    if not quiz_context:
        return
    collection_id, assigned_collections, session_id = quiz_context

    notification = create_notification(
        NotificationObjectType.Quiz,
        NotificationEventType.Answered,
        attemptlog.user_id,
        collection_id,
        assignment_collections=assigned_collections,
        quiz_id=quiz_id,
        quiz_num_correct=0,
        quiz_num_answered=0,
        course_session_id=session_id,
        timestamp=attemptlog.start_timestamp,
    )

    save_notifications([notification])

    exist_examattempt_notification.delete_key(
        attemptlog.user_id, quiz_id, course_session_id
    )


def create_examlog(examlog, timestamp):
    """
    Method called by the ExamLogSerializer when the
    examlog is created.
    It creates the Quiz Started notification
    """
    # Checks to add an 'Started' event
    if exist_exam_notification(examlog.user_id, examlog.exam_id):
        return  # the event has already been triggered
    event_type = NotificationEventType.Started
    exist_exam_notification.cache_clear()
    created_quiz_notification(examlog, event_type, timestamp)


def parse_examlog(examlog, timestamp):
    """
    Method called by the ExamLogSerializer everytime the
    summarylog is updated.
    It the exam is finished it creates the Quiz Completed notification
    """
    if not examlog.closed:
        return
    event_type = NotificationEventType.Completed
    created_quiz_notification(examlog, event_type, timestamp)


def create_examattemptslog(examlog, timestamp):
    """
    Method called by the ContentSummaryLogSerializer when the
    examattemptslog is created.
    It creates the Resource and, if needed, the ExamAttempt created event
    """
    # Checks to add an 'Answered' event
    if exist_examattempt_notification(examlog.user_id, examlog.exam_id):
        return  # the event has already been triggered
    event_type = NotificationEventType.Answered
    exist_examattempt_notification.cache_clear()
    created_quiz_notification(examlog, event_type, timestamp)


def parse_attemptslog(attemptlog, contentnode_id=None, course_session_id=None):
    """
    Method called by the AttemptLogSerializer everytime the
    attemptlog is updated.
    It more than 3 failed attempts exists, it creates a NeededHelp notification
    for the user & resource
    """
    # This event should not be triggered when an anonymous Learner is interacting with an Exercise:
    if not attemptlog.masterylog:
        return

    if course_session_id and contentnode_id:
        lesson = _get_lesson_dict(
            course_session_id=course_session_id,
            user=attemptlog.user,
            node_id=contentnode_id,
        )
        lessons = [(lesson, contentnode_id)] if lesson else []
    else:
        # This event should not be triggered when a Learner is interacting
        # with an Exercise outside of a Lesson:
        lessons = get_assignments(
            attemptlog.user, attemptlog.masterylog.summarylog, attempt=True
        )
    if not lessons:
        return

    summarylog = attemptlog.masterylog.summarylog
    needs_help = _is_summary_log_incompleted(summarylog) and _get_user_needs_help(
        attemptlog
    )
    notifications = []
    for lesson, contentnode_id in lessons:
        if needs_help:
            notification = _get_help_needed_notification(
                attemptlog, contentnode_id, lesson
            )
            if notification:
                notifications.append(notification)

        notifications_started = check_and_created_started(
            lesson, attemptlog.user_id, contentnode_id, attemptlog.start_timestamp
        )
        notifications += notifications_started

        # If the timestamps don't match, then it isn't a "started" event and
        # should be an answer attempt
        if attemptlog.start_timestamp != attemptlog.end_timestamp:
            notifications_answered = check_and_created_answered_lesson(
                lesson, attemptlog.user_id, contentnode_id, attemptlog.end_timestamp
            )
            if notifications_answered:
                notifications.append(notifications_answered)

    if notifications:
        save_notifications(notifications)


def batch_process_attemptlogs(attemptlog_ids):
    for attemptlog in AttemptLog.objects.filter(id__in=attemptlog_ids).exclude(
        masterylog__mastery_criterion__contains="coach_assigned"
    ):
        parse_attemptslog(attemptlog)


def batch_process_masterylogs_for_quizzes(masterylog_ids, attemptlog_ids):
    for attemptlog in (
        AttemptLog.objects.filter(id__in=attemptlog_ids)
        .filter(masterylog__mastery_criterion__contains="coach_assigned")
        .annotate(quiz_id=F("masterylog__summarylog__content_id"))
        .order_by("start_timestamp")
    ):
        quiz_answered_notification(attemptlog, attemptlog.quiz_id)
    for masterylog in (
        MasteryLog.objects.filter(id__in=masterylog_ids)
        .filter(mastery_criterion__contains="coach_assigned")
        .annotate(quiz_id=F("summarylog__content_id"))
    ):
        quiz_started_notification(masterylog, masterylog.quiz_id)
        quiz_completed_notification(masterylog, masterylog.quiz_id)


def batch_process_examlogs(examlog_ids, examattemptlog_ids):
    for examattemptlog in (
        ExamAttemptLog.objects.filter(id__in=examattemptlog_ids)
        .select_related("examlog")
        .order_by("start_timestamp")
    ):
        create_examlog(examattemptlog.examlog, examattemptlog.start_timestamp)
        create_examattemptslog(examattemptlog.examlog, examattemptlog.start_timestamp)
    for examlog in ExamLog.objects.filter(id__in=examlog_ids):
        parse_examlog(examlog, examlog.completion_timestamp)


def batch_process_summarylogs(summarylog_ids):
    for summarylog in ContentSummaryLog.objects.filter(id__in=summarylog_ids):
        create_summarylog(summarylog)
        parse_summarylog(summarylog)
