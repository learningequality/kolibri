import json

from morango.sync.context import LocalSessionContext

from .models import IndividualSyncableLesson
from .models import LessonAssignment
from kolibri.core.auth.constants.morango_sync import ScopeDefinitions
from kolibri.core.auth.management.utils import DisablePostDeleteSignal
from kolibri.core.auth.models import FacilityUser


def _get_our_cert(context):
    ss = context.sync_session
    return ss.server_certificate if ss.is_server else ss.client_certificate


def _get_their_cert(context):
    ss = context.sync_session
    return ss.client_certificate if ss.is_server else ss.server_certificate


def _this_side_using_single_user_cert(context):
    return _get_our_cert(context).scope_definition_id == ScopeDefinitions.SINGLE_USER


def _other_side_using_single_user_cert(context):
    return _get_their_cert(context).scope_definition_id == ScopeDefinitions.SINGLE_USER


def _get_user_for_single_user_sync(context):
    cert = None
    if _other_side_using_single_user_cert(context):
        cert = _get_their_cert(context)
    elif _this_side_using_single_user_cert(context):
        cert = _get_our_cert(context)
    else:
        return ""
    return FacilityUser.objects.get(id=json.loads(cert.scope_params)["user_id"])


def _initializing_handler(context):
    assert context is not None

    if (
        isinstance(context, LocalSessionContext)
        and context.is_producer
        and _other_side_using_single_user_cert(context)
    ):
        update_individual_syncable_lessons_from_assignments(
            _get_user_for_single_user_sync(context)
        )


def _cleanup_handler(context):
    assert context is not None

    if (
        isinstance(context, LocalSessionContext)
        and context.is_receiver
        and _this_side_using_single_user_cert(context)
    ):
        update_assignments_from_individual_syncable_lessons(
            _get_user_for_single_user_sync(context)
        )


def register_single_user_sync_lesson_handlers(session_controller):
    session_controller.signals.initializing.completed.connect(_initializing_handler)
    session_controller.signals.cleanup.completed.connect(_cleanup_handler)


def update_individual_syncable_lessons_from_assignments(user):
    """
    Updates the set of IndividualSyncableLesson objects for the user.
    """
    syncablelessons = IndividualSyncableLesson.objects.filter(user=user)
    assignments = LessonAssignment.objects.filter(
        collection__membership__user=user, lesson__is_active=True
    ).distinct()

    # get a list of all active assignments that don't have a syncable lesson
    to_create = assignments.exclude(
        lesson_id__in=syncablelessons.values_list("lesson_id")
    )

    # get a list of all syncable lessons that still have an active assignment
    to_update = syncablelessons.filter(
        lesson_id__in=assignments.values_list("lesson_id")
    )

    # get a list of all syncable lessons that don't have an active assignment anymore
    to_delete = syncablelessons.exclude(
        lesson_id__in=assignments.values_list("lesson_id")
    )

    # create new syncable lesson objects for all new assignments
    for assignment in to_create:
        IndividualSyncableLesson.objects.create(
            user=user,
            lesson_id=assignment.lesson_id,
            serialized_lesson=IndividualSyncableLesson.serialize_lesson(
                assignment.lesson
            ),
            collection=assignment.collection,
        )

    # update existing syncable lesson objects for all active assignments
    for syncablelesson in to_update:
        assignment = assignments.get(lesson_id=syncablelesson.lesson_id)
        updated_serialization = IndividualSyncableLesson.serialize_lesson(
            assignment.lesson
        )
        if (
            syncablelesson.serialized_lesson != updated_serialization
            or syncablelesson.collection_id != assignment.collection_id
        ):
            syncablelesson.serialized_lesson = updated_serialization
            syncablelesson.collection_id = assignment.collection_id
            syncablelesson.save()

    # delete syncable lesson objects that don't have an active assignment anymore
    to_delete.delete()


def update_assignments_from_individual_syncable_lessons(user):
    """
    Looks at IndividualSyncableLessons for a user and creates/deletes
    the corresponding Lessons and LessonAssignments as needed.
    """
    syncablelessons = IndividualSyncableLesson.objects.filter(user=user)
    assignments = LessonAssignment.objects.filter(
        collection__membership__user=user, lesson__is_active=True
    ).distinct()

    # get a list of all syncable lessons that aren't locally assigned
    to_create = syncablelessons.exclude(
        lesson_id__in=assignments.values_list("lesson_id")
    )

    # get a list of all assignments that may need updating from syncable lessons
    to_update = assignments.filter(
        lesson_id__in=syncablelessons.values_list("lesson_id")
    )

    # get a list of all active assignments that no longer have a syncable lesson
    to_delete = assignments.exclude(
        lesson_id__in=syncablelessons.values_list("lesson_id")
    )

    # create new assignments and lessons for all new syncable lesson objects
    for syncablelesson in to_create:

        lesson = IndividualSyncableLesson.deserialize_lesson(
            syncablelesson.serialized_lesson
        )
        lesson.collection = syncablelesson.collection
        # shouldn't need to set this field (as it's nullable, according to the model definition, but got errors)
        lesson.created_by = user
        lesson.save(update_dirty_bit_to=None)

        try:
            LessonAssignment.objects.get(
                collection=syncablelesson.collection,
                lesson=lesson,
            )
        except LessonAssignment.DoesNotExist:
            assignment = LessonAssignment(
                collection=syncablelesson.collection,
                lesson=lesson,
                assigned_by=user,  # failed validation without this, so pretend it's self-assigned
            )
            assignment.save(update_dirty_bit_to=None)

    # update existing lesson/assignment objects for all syncable lessons
    for assignment in to_update:
        syncablelesson = syncablelessons.get(lesson_id=assignment.lesson_id)
        updated_serialization = IndividualSyncableLesson.serialize_lesson(
            assignment.lesson
        )
        if (
            syncablelesson.serialized_lesson != updated_serialization
            or syncablelesson.collection_id != assignment.collection_id
        ):
            lesson = IndividualSyncableLesson.deserialize_lesson(
                syncablelesson.serialized_lesson
            )
            lesson.save(update_dirty_bit_to=None)
            assignment.lesson = lesson
            assignment.collection_id = syncablelesson.collection_id
            assignment.save(update_dirty_bit_to=None)

    # delete lessons/assignments that no longer have a syncable lesson object
    with DisablePostDeleteSignal():
        to_delete.delete()
