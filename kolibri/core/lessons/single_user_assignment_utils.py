from .models import IndividualSyncableLesson
from .models import LessonAssignment
from kolibri.core.auth.utils.delete import DisablePostDeleteSignal


def update_individual_syncable_lessons_from_assignments(user_id):
    """
    Updates the set of IndividualSyncableLesson objects for the user.
    """
    syncablelessons = IndividualSyncableLesson.objects.filter(user_id=user_id)
    assignments = LessonAssignment.objects.filter(
        collection__membership__user_id=user_id, lesson__is_active=True
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
            user_id=user_id,
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


def update_assignments_from_individual_syncable_lessons(user_id):
    """
    Looks at IndividualSyncableLessons for a user and creates/deletes
    the corresponding Lessons and LessonAssignments as needed.
    """
    syncablelessons = IndividualSyncableLesson.objects.filter(user_id=user_id)
    assignments = LessonAssignment.objects.filter(
        collection__membership__user_id=user_id, lesson__is_active=True
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
        lesson.collection_id = syncablelesson.collection_id
        # shouldn't need to set this field (as it's nullable, according to the model definition, but got errors)
        lesson.created_by_id = user_id
        lesson.save(update_dirty_bit_to=False)

        try:
            LessonAssignment.objects.get(
                collection=syncablelesson.collection,
                lesson=lesson,
            )
        except LessonAssignment.DoesNotExist:
            assignment = LessonAssignment(
                collection=syncablelesson.collection,
                lesson=lesson,
                assigned_by_id=user_id,  # failed validation without this, so pretend it's self-assigned
            )
            assignment.save(update_dirty_bit_to=False)

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
            lesson.collection_id = syncablelesson.collection_id
            lesson.created_by_id = user_id
            lesson.save(update_dirty_bit_to=False)
            assignment.lesson = lesson
            assignment.collection_id = syncablelesson.collection_id
            assignment.save(update_dirty_bit_to=False)

    # delete lessons/assignments that no longer have a syncable lesson object
    with DisablePostDeleteSignal():
        to_delete.delete()
